import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppointmentStatus, MedicalRecordStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';

type AppointmentWithRelations = {
  id: string;
  tutorId: string;
  patientId: string;
  veterinarianName: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
  patient: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
  };
  tutor: {
    id: string;
    name: string;
    phone: string | null;
    email?: string | null;
  };
  medicalRecord?: {
    id: string;
    appointmentId: string;
    status: MedicalRecordStatus;
    recommendedReturnAt: Date | null;
  } | null;
};

function buildAppointment(
  overrides?: Partial<AppointmentWithRelations>,
): AppointmentWithRelations {
  return {
    id: 'appt-1',
    tutorId: 'tutor-1',
    patientId: 'patient-1',
    veterinarianName: 'Dra. Camila Souza',
    startsAt: new Date('2026-04-24T09:00:00.000Z'),
    endsAt: new Date('2026-04-24T09:30:00.000Z'),
    reason: 'Consulta de rotina',
    status: AppointmentStatus.SCHEDULED,
    notes: null,
    createdAt: new Date('2026-04-24T08:00:00.000Z'),
    updatedAt: new Date('2026-04-24T08:00:00.000Z'),
    canceledAt: null,
    patient: {
      id: 'patient-1',
      name: 'Thor',
      species: 'Canino',
      breed: 'Labrador',
    },
    tutor: {
      id: 'tutor-1',
      name: 'Marina Araujo',
      phone: '(11) 99999-1001',
      email: 'marina@easyvet.local',
    },
    ...overrides,
  };
}

describe('AppointmentsService audit trail', () => {
  it('consolida metricas de consultas por periodo', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      clinicScheduleSettings: {
        upsert: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { status: AppointmentStatus.SCHEDULED, reason: 'Consulta de rotina' },
          {
            status: AppointmentStatus.COMPLETED,
            reason: 'Retorno - Reavaliacao',
          },
          { status: AppointmentStatus.NO_SHOW, reason: 'Retorno - Vacina' },
          { status: AppointmentStatus.CANCELED, reason: 'Consulta geral' },
        ]),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    const metrics = await service.metrics({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-07',
    });

    expect(metrics.total).toBe(4);
    expect(metrics.completed).toBe(1);
    expect(metrics.noShow).toBe(1);
    expect(metrics.returnAppointments).toBe(2);
    expect(metrics.returnRate).toBe(50);
    expect(metrics.noShowRate).toBe(25);
    expect(metrics.completionRate).toBe(25);
  });

  it('valida faixa de datas nas metricas', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      clinicScheduleSettings: {
        upsert: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    await expect(
      service.metrics({
        dateFrom: '2026-04-10',
        dateTo: '2026-04-01',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it('consolida tendencia semanal de no-show e cancelamento', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      clinicScheduleSettings: {
        upsert: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            startsAt: new Date('2026-04-02T09:00:00.000Z'),
            status: AppointmentStatus.NO_SHOW,
          },
          {
            startsAt: new Date('2026-04-03T10:00:00.000Z'),
            status: AppointmentStatus.CANCELED,
          },
          {
            startsAt: new Date('2026-04-09T08:00:00.000Z'),
            status: AppointmentStatus.NO_SHOW,
          },
          {
            startsAt: new Date('2026-04-10T11:00:00.000Z'),
            status: AppointmentStatus.COMPLETED,
          },
          {
            startsAt: new Date('2026-04-11T13:00:00.000Z'),
            status: AppointmentStatus.CANCELED,
          },
        ]),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    const weeklyTrend = await service.weeklyTrend({
      dateTo: '2026-04-14',
      weeks: '2',
    });

    expect(weeklyTrend.weeks).toBe(2);
    expect(weeklyTrend.trend).toHaveLength(2);
    expect(weeklyTrend.trend[0]).toEqual(
      expect.objectContaining({
        weekStart: '2026-04-01',
        weekEnd: '2026-04-07',
        total: 2,
        noShow: 1,
        canceled: 1,
        noShowRate: 50,
        canceledRate: 50,
      }),
    );
    expect(weeklyTrend.trend[1]).toEqual(
      expect.objectContaining({
        weekStart: '2026-04-08',
        weekEnd: '2026-04-14',
        total: 3,
        noShow: 1,
        canceled: 1,
        noShowRate: 33.3,
        canceledRate: 33.3,
      }),
    );
  });

  it('valida janela semanal de tendencia', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      clinicScheduleSettings: {
        upsert: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    await expect(
      service.weeklyTrend({
        dateTo: '2026-04-10',
        weeks: '20',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it('registra evento de auditoria ao remarcar consulta', async () => {
    const previous = buildAppointment();
    const updated = buildAppointment({
      startsAt: new Date('2026-04-24T11:00:00.000Z'),
      endsAt: new Date('2026-04-24T11:30:00.000Z'),
      veterinarianName: 'Dr. Rafael Lima',
    });

    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn().mockResolvedValue(previous),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(updated),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    const result = await service.reschedule(previous.id, {
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      veterinarianName: updated.veterinarianName,
    });

    expect(result.id).toBe(updated.id);
    expect(auditEvents.register).toHaveBeenCalledTimes(1);
    const [auditPayload] = auditEvents.register.mock.calls[0] as [
      {
        action: string;
        entity: string;
        entityId: string;
        summary: string;
      },
    ];
    expect(auditPayload.entity).toBe('APPOINTMENT');
    expect(auditPayload.entityId).toBe(previous.id);
    expect(auditPayload.action).toBe('APPOINTMENT_RESCHEDULED');
    expect(auditPayload.summary).toContain(previous.startsAt.toISOString());
    expect(auditPayload.summary).toContain(updated.startsAt.toISOString());
  });

  it('nao registra auditoria quando remarcacao falha por conflito', async () => {
    const previous = buildAppointment();

    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn().mockResolvedValue(previous),
        findFirst: jest.fn().mockResolvedValue({
          id: 'conflict-1',
        }),
        update: jest.fn(),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    await expect(
      service.reschedule(previous.id, {
        startsAt: new Date('2026-04-24T09:15:00.000Z').toISOString(),
        endsAt: new Date('2026-04-24T09:45:00.000Z').toISOString(),
        veterinarianName: previous.veterinarianName,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.appointment.update).not.toHaveBeenCalled();
    expect(auditEvents.register).not.toHaveBeenCalled();
  });

  it('agenda retorno automatico e registra auditoria', async () => {
    const source = buildAppointment({
      id: 'appt-source-1',
      reason: 'Retorno dermatologico',
      veterinarianName: 'Dr. Rafael Lima',
      medicalRecord: {
        id: 'record-1',
        appointmentId: 'appt-source-1',
        status: MedicalRecordStatus.FINALIZED,
        recommendedReturnAt: new Date('2027-01-15T12:00:00.000Z'),
      },
    });
    const created = buildAppointment({
      id: 'appt-return-1',
      startsAt: new Date('2027-01-15T08:00:00.000Z'),
      endsAt: new Date('2027-01-15T08:30:00.000Z'),
      veterinarianName: source.veterinarianName,
      reason: 'Retorno - Retorno dermatologico',
    });

    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      clinicScheduleSettings: {
        upsert: jest.fn().mockResolvedValue({
          id: 'default',
          consultationDurationMinutes: 30,
          openingTime: '08:00',
          closingTime: '18:00',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
      appointment: {
        findUnique: jest.fn().mockResolvedValue(source),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue(created),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    const result = await service.scheduleReturn(source.id);

    expect(result.id).toBe(created.id);
    expect(prisma.appointment.create).toHaveBeenCalledTimes(1);
    expect(auditEvents.register).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RETURN_APPOINTMENT_SCHEDULED',
        entityId: created.id,
      }),
    );
  });

  it('bloqueia retorno automatico quando prontuario nao esta finalizado', async () => {
    const source = buildAppointment({
      id: 'appt-source-2',
      medicalRecord: {
        id: 'record-2',
        appointmentId: 'appt-source-2',
        status: MedicalRecordStatus.DRAFT,
        recommendedReturnAt: new Date('2027-01-15T12:00:00.000Z'),
      },
    });

    const prisma = {
      patient: {
        findFirst: jest.fn(),
      },
      clinicScheduleSettings: {
        upsert: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn().mockResolvedValue(source),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AppointmentsService(
      prisma as never,
      auditEvents as never,
    );

    await expect(service.scheduleReturn(source.id)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );

    expect(prisma.appointment.create).not.toHaveBeenCalled();
    expect(auditEvents.register).not.toHaveBeenCalled();
  });
});
