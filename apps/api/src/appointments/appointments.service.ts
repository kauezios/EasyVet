import { AppointmentStatus, Prisma } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.appointment.update({
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
}
