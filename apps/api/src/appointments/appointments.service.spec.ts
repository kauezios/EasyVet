import { ConflictException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
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
});
