import { AppointmentStatus, MedicalRecordStatus, Prisma } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
];
const DEFAULT_SCHEDULE_SETTINGS_ID = 'default';
const DEFAULT_CONSULTATION_DURATION_MINUTES = 30;
const DEFAULT_OPENING_TIME = '08:00';
const DEFAULT_CLOSING_TIME = '18:00';
const RETURN_SEARCH_DAYS_LIMIT = 30;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: dto.patientId,
        deletedAt: null,
      },
      select: {
        id: true,
        tutorId: true,
      },
    });

    if (!patient) {
      throw new NotFoundException({
        code: 'PATIENT_NOT_FOUND',
        message: 'Paciente nao encontrado',
      });
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.validateDateRange(startsAt, endsAt);

    await this.ensureNoScheduleConflict(
      dto.veterinarianName,
      startsAt,
      endsAt,
      null,
    );

    return this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        tutorId: patient.tutorId,
        veterinarianName: dto.veterinarianName,
        startsAt,
        endsAt,
        reason: dto.reason,
        notes: dto.notes,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  async list(query: ListAppointmentsQueryDto) {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.date) {
      const start = new Date(`${query.date}T00:00:00`);
      const end = new Date(`${query.date}T23:59:59.999`);

      where.startsAt = {
        gte: start,
        lte: end,
      };
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.veterinarianName) {
      where.veterinarianName = {
        contains: query.veterinarianName,
        mode: 'insensitive',
      };
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: {
        startsAt: 'asc',
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Consulta nao encontrada',
      });
    }

    return appointment;
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.findOne(id);

    const startsAt = dto.startsAt
      ? new Date(dto.startsAt)
      : appointment.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : appointment.endsAt;
    const veterinarianName =
      dto.veterinarianName ?? appointment.veterinarianName;

    this.validateDateRange(startsAt, endsAt);

    await this.ensureNoScheduleConflict(
      veterinarianName,
      startsAt,
      endsAt,
      appointment.id,
    );

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        startsAt,
        endsAt,
        veterinarianName,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    await this.auditEvents.register({
      actorId: null,
      entity: 'APPOINTMENT',
      entityId: updated.id,
      action: 'APPOINTMENT_RESCHEDULED',
      summary: this.buildRescheduleAuditSummary(appointment, updated),
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto) {
    await this.findOne(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        canceledAt:
          dto.status === AppointmentStatus.CANCELED ? new Date() : null,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  async scheduleReturn(appointmentId: string) {
    const sourceAppointment = await this.prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        medicalRecord: true,
      },
    });

    if (!sourceAppointment) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Consulta nao encontrada',
      });
    }

    if (
      !sourceAppointment.medicalRecord ||
      sourceAppointment.medicalRecord.status !== MedicalRecordStatus.FINALIZED
    ) {
      throw new UnprocessableEntityException({
        code: 'RETURN_REQUIRES_FINALIZED_MEDICAL_RECORD',
        message:
          'A consulta precisa ter prontuario finalizado para agendar retorno automatico',
      });
    }

    if (!sourceAppointment.medicalRecord.recommendedReturnAt) {
      throw new UnprocessableEntityException({
        code: 'RETURN_DATE_NOT_DEFINED',
        message:
          'Defina uma data sugerida de retorno no prontuario antes de usar o agendamento automatico',
      });
    }

    const scheduleSettings = await this.prisma.clinicScheduleSettings.upsert({
      where: {
        id: DEFAULT_SCHEDULE_SETTINGS_ID,
      },
      update: {},
      create: {
        id: DEFAULT_SCHEDULE_SETTINGS_ID,
        consultationDurationMinutes: DEFAULT_CONSULTATION_DURATION_MINUTES,
        openingTime: DEFAULT_OPENING_TIME,
        closingTime: DEFAULT_CLOSING_TIME,
      },
    });

    const slot = await this.findNextAvailableReturnSlot({
      baseDate: sourceAppointment.medicalRecord.recommendedReturnAt,
      veterinarianName: sourceAppointment.veterinarianName,
      consultationDurationMinutes: scheduleSettings.consultationDurationMinutes,
      openingTime: scheduleSettings.openingTime,
      closingTime: scheduleSettings.closingTime,
    });

    const reason = `Retorno - ${sourceAppointment.reason}`.slice(0, 300);

    const created = await this.prisma.appointment.create({
      data: {
        patientId: sourceAppointment.patientId,
        tutorId: sourceAppointment.tutorId,
        veterinarianName: sourceAppointment.veterinarianName,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        reason,
        notes: `Retorno automatico gerado da consulta ${sourceAppointment.id}`,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    await this.auditEvents.register({
      actorId: null,
      entity: 'APPOINTMENT',
      entityId: created.id,
      action: 'RETURN_APPOINTMENT_SCHEDULED',
      summary: `Retorno criado automaticamente da consulta ${sourceAppointment.id} para ${created.startsAt.toISOString()}`,
    });

    return created;
  }

  private validateDateRange(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new UnprocessableEntityException({
        code: 'APPOINTMENT_INVALID_DATE',
        message: 'Data ou horario invalido para consulta',
      });
    }

    if (startsAt >= endsAt) {
      throw new UnprocessableEntityException({
        code: 'APPOINTMENT_INVALID_RANGE',
        message: 'Horario inicial deve ser menor que o horario final',
      });
    }
  }

  private async ensureNoScheduleConflict(
    veterinarianName: string,
    startsAt: Date,
    endsAt: Date,
    appointmentIdToIgnore: string | null,
  ): Promise<void> {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        veterinarianName,
        status: {
          in: ACTIVE_STATUSES,
        },
        startsAt: {
          lt: endsAt,
        },
        endsAt: {
          gt: startsAt,
        },
        ...(appointmentIdToIgnore
          ? {
              id: {
                not: appointmentIdToIgnore,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (conflict) {
      throw new ConflictException({
        code: 'APPOINTMENT_TIME_CONFLICT',
        message: 'Veterinario ja possui consulta neste intervalo de horario',
      });
    }
  }

  private buildRescheduleAuditSummary(
    previous: {
      startsAt: Date;
      endsAt: Date;
      veterinarianName: string;
    },
    updated: {
      startsAt: Date;
      endsAt: Date;
      veterinarianName: string;
    },
  ): string {
    const previousWindow = `${previous.startsAt.toISOString()} - ${previous.endsAt.toISOString()}`;
    const updatedWindow = `${updated.startsAt.toISOString()} - ${updated.endsAt.toISOString()}`;

    if (previous.veterinarianName === updated.veterinarianName) {
      return `Consulta remarcada de ${previousWindow} para ${updatedWindow}`;
    }

    return `Consulta remarcada de ${previousWindow} para ${updatedWindow}; veterinario alterado de ${previous.veterinarianName} para ${updated.veterinarianName}`;
  }

  private async findNextAvailableReturnSlot(input: {
    baseDate: Date;
    veterinarianName: string;
    consultationDurationMinutes: number;
    openingTime: string;
    closingTime: string;
  }): Promise<{ startsAt: Date; endsAt: Date }> {
    const now = new Date();
    const baseDay = new Date(input.baseDate);
    baseDay.setHours(0, 0, 0, 0);

    for (
      let dayOffset = 0;
      dayOffset <= RETURN_SEARCH_DAYS_LIMIT;
      dayOffset += 1
    ) {
      const day = new Date(baseDay);
      day.setDate(baseDay.getDate() + dayOffset);

      const slots = this.buildDaySlots(day, {
        consultationDurationMinutes: input.consultationDurationMinutes,
        openingTime: input.openingTime,
        closingTime: input.closingTime,
      });

      for (const slot of slots) {
        if (slot.startsAt.getTime() <= now.getTime()) {
          continue;
        }

        try {
          await this.ensureNoScheduleConflict(
            input.veterinarianName,
            slot.startsAt,
            slot.endsAt,
            null,
          );

          return slot;
        } catch (error) {
          if (error instanceof ConflictException) {
            continue;
          }

          throw error;
        }
      }
    }

    throw new UnprocessableEntityException({
      code: 'RETURN_NO_AVAILABLE_SLOT',
      message:
        'Nao foi encontrado horario livre para retorno dentro da janela de busca configurada',
    });
  }

  private buildDaySlots(
    day: Date,
    settings: {
      consultationDurationMinutes: number;
      openingTime: string;
      closingTime: string;
    },
  ): Array<{ startsAt: Date; endsAt: Date }> {
    const dayKey = day.toISOString().slice(0, 10);
    const startMinutes = this.timeToMinutes(settings.openingTime);
    const endMinutes = this.timeToMinutes(settings.closingTime);
    const slots: Array<{ startsAt: Date; endsAt: Date }> = [];

    for (
      let current = startMinutes;
      current + settings.consultationDurationMinutes <= endMinutes;
      current += settings.consultationDurationMinutes
    ) {
      const startsAt = this.minutesToDate(dayKey, current);
      const endsAt = new Date(
        startsAt.getTime() + settings.consultationDurationMinutes * 60 * 1000,
      );

      slots.push({
        startsAt,
        endsAt,
      });
    }

    return slots;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToDate(dayKey: string, absoluteMinutes: number): Date {
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;
    return new Date(
      `${dayKey}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
    );
  }
}
