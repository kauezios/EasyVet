import {
  AppointmentStatus,
  MedicalRecord,
  MedicalRecordStatus,
} from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveMedicalRecordDraftDto } from './dto/save-medical-record-draft.dto';
import { FinalizeMedicalRecordDto } from './dto/finalize-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async start(appointmentId: string): Promise<MedicalRecord> {
    await this.ensureAppointmentExists(appointmentId);

    return this.prisma.medicalRecord.upsert({
      where: {
        appointmentId,
      },
      create: {
        appointmentId,
        status: MedicalRecordStatus.DRAFT,
      },
      update: {},
    });
  }

  async findByAppointment(appointmentId: string): Promise<MedicalRecord> {
    await this.ensureAppointmentExists(appointmentId);

    const record = await this.prisma.medicalRecord.findUnique({
      where: {
        appointmentId,
      },
    });

    if (!record) {
      throw new NotFoundException({
        code: 'MEDICAL_RECORD_NOT_FOUND',
        message: 'Prontuario ainda nao iniciado para esta consulta',
      });
    }

    return record;
  }

  async saveDraft(
    appointmentId: string,
    dto: SaveMedicalRecordDraftDto,
  ): Promise<MedicalRecord> {
    await this.ensureAppointmentExists(appointmentId);

    const payload = this.toMedicalRecordPayload(dto);

    return this.prisma.medicalRecord.upsert({
      where: {
        appointmentId,
      },
      create: {
        appointmentId,
        status: MedicalRecordStatus.DRAFT,
        ...payload,
      },
      update: {
        status: MedicalRecordStatus.DRAFT,
        ...payload,
      },
    });
  }

  async finalize(
    appointmentId: string,
    dto: FinalizeMedicalRecordDto,
    actorId?: string,
  ): Promise<MedicalRecord> {
    await this.ensureAppointmentExists(appointmentId);

    const requiredFields = [
      { field: 'chiefComplaint', value: dto.chiefComplaint },
      { field: 'symptomsOnset', value: dto.symptomsOnset },
      { field: 'clinicalHistory', value: dto.clinicalHistory },
      { field: 'physicalExam', value: dto.physicalExam },
      { field: 'presumptiveDiagnosis', value: dto.presumptiveDiagnosis },
      { field: 'conduct', value: dto.conduct },
      { field: 'guidance', value: dto.guidance },
    ];

    const missing = requiredFields.filter(({ value }) => this.isBlank(value));

    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        code: 'MEDICAL_RECORD_REQUIRED_FIELDS_MISSING',
        message: 'Campos obrigatorios ausentes para finalizar prontuario',
        details: missing.map((item) => ({
          field: item.field,
          issue: 'required',
        })),
      });
    }

    const payload = this.toMedicalRecordPayload(dto);

    const record = await this.prisma.medicalRecord.upsert({
      where: {
        appointmentId,
      },
      create: {
        appointmentId,
        status: MedicalRecordStatus.FINALIZED,
        finalizedAt: new Date(),
        ...payload,
      },
      update: {
        status: MedicalRecordStatus.FINALIZED,
        finalizedAt: new Date(),
        ...payload,
      },
    });

    await this.prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: AppointmentStatus.COMPLETED,
      },
    });

    await this.auditEvents.register({
      actorId: actorId ?? null,
      entity: 'MEDICAL_RECORD',
      entityId: record.id,
      action: 'MEDICAL_RECORD_FINALIZED',
      summary: `Prontuario finalizado para consulta ${appointmentId}`,
    });

    return record;
  }

  private async ensureAppointmentExists(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      select: {
        id: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Consulta nao encontrada',
      });
    }
  }

  private toMedicalRecordPayload(
    dto: SaveMedicalRecordDraftDto | FinalizeMedicalRecordDto,
  ): Omit<
    MedicalRecord,
    | 'id'
    | 'appointmentId'
    | 'status'
    | 'finalizedAt'
    | 'createdAt'
    | 'updatedAt'
  > {
    return {
      chiefComplaint: this.normalizeText(dto.chiefComplaint),
      symptomsOnset: this.normalizeText(dto.symptomsOnset),
      clinicalHistory: this.normalizeText(dto.clinicalHistory),
      physicalExam: this.normalizeText(dto.physicalExam),
      presumptiveDiagnosis: this.normalizeText(dto.presumptiveDiagnosis),
      conduct: this.normalizeText(dto.conduct),
      guidance: this.normalizeText(dto.guidance),
      recommendedReturnAt: dto.recommendedReturnAt
        ? new Date(dto.recommendedReturnAt)
        : null,
    };
  }

  private normalizeText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private isBlank(value: string | undefined): boolean {
    return value === undefined || value.trim().length === 0;
  }
}
