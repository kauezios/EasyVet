/* eslint-disable @typescript-eslint/require-await */
import {
  AppointmentStatus,
  MedicalRecordStatus,
  PatientSex,
} from '@prisma/client';

type TutorEntity = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type PatientEntity = {
  id: string;
  tutorId: string;
  name: string;
  species: string;
  breed: string | null;
  sex: PatientSex;
  birthDate: Date | null;
  currentWeight: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type AppointmentEntity = {
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
};

type MedicalRecordEntity = {
  id: string;
  appointmentId: string;
  status: MedicalRecordStatus;
  chiefComplaint: string | null;
  symptomsOnset: string | null;
  clinicalHistory: string | null;
  physicalExam: string | null;
  presumptiveDiagnosis: string | null;
  conduct: string | null;
  guidance: string | null;
  recommendedReturnAt: Date | null;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditEventEntity = {
  id: string;
  actorId: string | null;
  entity: string;
  entityId: string;
  action: string;
  summary: string | null;
  createdAt: Date;
};

function copyEntity<T extends object>(entity: T): T {
  return { ...entity };
}

function pickSelected<T extends object>(
  entity: T,
  select: Record<string, boolean> | undefined,
): Partial<T> | T {
  if (!select) {
    return copyEntity(entity);
  }

  const selected = {} as Partial<T>;
  for (const key of Object.keys(select)) {
    if (select[key]) {
      selected[key as keyof T] = entity[key as keyof T];
    }
  }
  return selected;
}

export function createInMemoryPrisma() {
  const tutors: TutorEntity[] = [];
  const patients: PatientEntity[] = [];
  const appointments: AppointmentEntity[] = [];
  const medicalRecords: MedicalRecordEntity[] = [];
  const auditEvents: AuditEventEntity[] = [];

  let sequence = 0;
  const createId = (prefix: string) => `${prefix}-${++sequence}`;

  const findTutorById = (id: string) => tutors.find((item) => item.id === id);
  const findPatientById = (id: string) =>
    patients.find((item) => item.id === id);

  const mapAppointment = (
    appointment: AppointmentEntity,
    include?: {
      patient?: { select?: Record<string, boolean> };
      tutor?: { select?: Record<string, boolean> };
    },
    select?: Record<string, boolean>,
  ) => {
    if (select) {
      return pickSelected(appointment, select);
    }

    const base = copyEntity(appointment) as AppointmentEntity & {
      patient?: unknown;
      tutor?: unknown;
    };

    if (include?.patient) {
      const patient = findPatientById(appointment.patientId);
      if (patient) {
        base.patient = pickSelected(patient, include.patient.select);
      }
    }

    if (include?.tutor) {
      const tutor = findTutorById(appointment.tutorId);
      if (tutor) {
        base.tutor = pickSelected(tutor, include.tutor.select);
      }
    }

    return base;
  };

  const prisma = {
    tutor: {
      create: async ({ data }: { data: Partial<TutorEntity> }) => {
        const now = new Date();
        const created: TutorEntity = {
          id: createId('tutor'),
          name: data.name ?? '',
          document: data.document ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        tutors.push(created);
        return copyEntity(created);
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where?: { deletedAt?: null };
        orderBy?: { createdAt?: 'asc' | 'desc' };
      }) => {
        const filtered = tutors.filter((item) =>
          where?.deletedAt === null ? item.deletedAt === null : true,
        );

        if (orderBy?.createdAt === 'desc') {
          filtered.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }

        if (orderBy?.createdAt === 'asc') {
          filtered.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }

        return filtered.map((item) => copyEntity(item));
      },
      findFirst: async ({
        where,
        select,
      }: {
        where?: { id?: string; deletedAt?: null };
        select?: Record<string, boolean>;
      }) => {
        const found = tutors.find((item) => {
          if (where?.id && item.id !== where.id) {
            return false;
          }
          if (where?.deletedAt === null && item.deletedAt !== null) {
            return false;
          }
          return true;
        });

        if (!found) {
          return null;
        }

        return pickSelected(found, select);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<TutorEntity>;
      }) => {
        const target = findTutorById(where.id);
        if (!target) {
          throw new Error('Tutor not found');
        }

        Object.assign(target, data, { updatedAt: new Date() });
        return copyEntity(target);
      },
    },

    patient: {
      create: async ({ data }: { data: Partial<PatientEntity> }) => {
        const now = new Date();
        const created: PatientEntity = {
          id: createId('patient'),
          tutorId: data.tutorId ?? '',
          name: data.name ?? '',
          species: data.species ?? '',
          breed: data.breed ?? null,
          sex: data.sex ?? PatientSex.UNKNOWN,
          birthDate: data.birthDate ?? null,
          currentWeight: data.currentWeight ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        patients.push(created);
        return copyEntity(created);
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where?: { deletedAt?: null };
        orderBy?: { createdAt?: 'asc' | 'desc' };
      }) => {
        const filtered = patients.filter((item) =>
          where?.deletedAt === null ? item.deletedAt === null : true,
        );

        if (orderBy?.createdAt === 'desc') {
          filtered.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }

        if (orderBy?.createdAt === 'asc') {
          filtered.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }

        return filtered.map((item) => copyEntity(item));
      },
      findFirst: async ({
        where,
        select,
      }: {
        where?: { id?: string; tutorId?: string; deletedAt?: null };
        select?: Record<string, boolean>;
      }) => {
        const found = patients.find((item) => {
          if (where?.id && item.id !== where.id) {
            return false;
          }
          if (where?.tutorId && item.tutorId !== where.tutorId) {
            return false;
          }
          if (where?.deletedAt === null && item.deletedAt !== null) {
            return false;
          }
          return true;
        });

        if (!found) {
          return null;
        }

        return pickSelected(found, select);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<PatientEntity>;
      }) => {
        const target = findPatientById(where.id);
        if (!target) {
          throw new Error('Patient not found');
        }

        Object.assign(target, data, { updatedAt: new Date() });
        return copyEntity(target);
      },
    },

    appointment: {
      create: async ({
        data,
        include,
      }: {
        data: Partial<AppointmentEntity>;
        include?: {
          patient?: { select?: Record<string, boolean> };
          tutor?: { select?: Record<string, boolean> };
        };
      }) => {
        const now = new Date();
        const created: AppointmentEntity = {
          id: createId('appointment'),
          tutorId: data.tutorId ?? '',
          patientId: data.patientId ?? '',
          veterinarianName: data.veterinarianName ?? '',
          startsAt: data.startsAt ?? now,
          endsAt: data.endsAt ?? now,
          reason: data.reason ?? '',
          status: data.status ?? AppointmentStatus.SCHEDULED,
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now,
          canceledAt: null,
        };
        appointments.push(created);
        return mapAppointment(created, include);
      },
      findMany: async ({
        where,
        orderBy,
        include,
      }: {
        where?: {
          startsAt?: { gte?: Date; lte?: Date };
          veterinarianName?: { contains?: string; mode?: 'insensitive' };
        };
        orderBy?: { startsAt?: 'asc' | 'desc' };
        include?: {
          patient?: { select?: Record<string, boolean> };
          tutor?: { select?: Record<string, boolean> };
        };
      }) => {
        const filtered = appointments.filter((item) => {
          if (where?.startsAt?.gte && item.startsAt < where.startsAt.gte) {
            return false;
          }
          if (where?.startsAt?.lte && item.startsAt > where.startsAt.lte) {
            return false;
          }

          const search = where?.veterinarianName?.contains;
          if (search) {
            const source =
              where?.veterinarianName.mode === 'insensitive'
                ? item.veterinarianName.toLowerCase()
                : item.veterinarianName;
            const query =
              where?.veterinarianName.mode === 'insensitive'
                ? search.toLowerCase()
                : search;
            if (!source.includes(query)) {
              return false;
            }
          }

          return true;
        });

        if (orderBy?.startsAt === 'asc') {
          filtered.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
        }

        if (orderBy?.startsAt === 'desc') {
          filtered.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
        }

        return filtered.map((item) => mapAppointment(item, include));
      },
      findUnique: async ({
        where,
        include,
        select,
      }: {
        where: { id?: string };
        include?: {
          patient?: { select?: Record<string, boolean> };
          tutor?: { select?: Record<string, boolean> };
        };
        select?: Record<string, boolean>;
      }) => {
        const found = appointments.find((item) => item.id === where.id);
        if (!found) {
          return null;
        }
        return mapAppointment(found, include, select);
      },
      findFirst: async ({
        where,
        select,
      }: {
        where?: {
          veterinarianName?: string;
          status?: { in?: AppointmentStatus[] };
          startsAt?: { lt?: Date };
          endsAt?: { gt?: Date };
          id?: { not?: string };
        };
        select?: Record<string, boolean>;
      }) => {
        const found = appointments.find((item) => {
          if (
            where?.veterinarianName &&
            item.veterinarianName !== where.veterinarianName
          ) {
            return false;
          }
          if (where?.status?.in && !where.status.in.includes(item.status)) {
            return false;
          }
          if (where?.startsAt?.lt && !(item.startsAt < where.startsAt.lt)) {
            return false;
          }
          if (where?.endsAt?.gt && !(item.endsAt > where.endsAt.gt)) {
            return false;
          }
          if (where?.id?.not && item.id === where.id.not) {
            return false;
          }
          return true;
        });

        if (!found) {
          return null;
        }

        return pickSelected(found, select);
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Partial<AppointmentEntity>;
        include?: {
          patient?: { select?: Record<string, boolean> };
          tutor?: { select?: Record<string, boolean> };
        };
      }) => {
        const target = appointments.find((item) => item.id === where.id);
        if (!target) {
          throw new Error('Appointment not found');
        }

        Object.assign(target, data, { updatedAt: new Date() });
        return mapAppointment(target, include);
      },
    },

    medicalRecord: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { appointmentId: string };
        create: Partial<MedicalRecordEntity>;
        update: Partial<MedicalRecordEntity>;
      }) => {
        const existing = medicalRecords.find(
          (item) => item.appointmentId === where.appointmentId,
        );

        if (!existing) {
          const now = new Date();
          const created: MedicalRecordEntity = {
            id: createId('record'),
            appointmentId: create.appointmentId ?? where.appointmentId,
            status: create.status ?? MedicalRecordStatus.DRAFT,
            chiefComplaint: create.chiefComplaint ?? null,
            symptomsOnset: create.symptomsOnset ?? null,
            clinicalHistory: create.clinicalHistory ?? null,
            physicalExam: create.physicalExam ?? null,
            presumptiveDiagnosis: create.presumptiveDiagnosis ?? null,
            conduct: create.conduct ?? null,
            guidance: create.guidance ?? null,
            recommendedReturnAt: create.recommendedReturnAt ?? null,
            finalizedAt: create.finalizedAt ?? null,
            createdAt: now,
            updatedAt: now,
          };
          medicalRecords.push(created);
          return copyEntity(created);
        }

        Object.assign(existing, update, { updatedAt: new Date() });
        return copyEntity(existing);
      },
      findUnique: async ({ where }: { where: { appointmentId: string } }) => {
        const found = medicalRecords.find(
          (item) => item.appointmentId === where.appointmentId,
        );
        return found ? copyEntity(found) : null;
      },
    },

    auditEvent: {
      create: async ({ data }: { data: Partial<AuditEventEntity> }) => {
        const created: AuditEventEntity = {
          id: createId('audit'),
          actorId: data.actorId ?? null,
          entity: data.entity ?? '',
          entityId: data.entityId ?? '',
          action: data.action ?? '',
          summary: data.summary ?? null,
          createdAt: data.createdAt ?? new Date(),
        };
        auditEvents.push(created);
        return copyEntity(created);
      },
      findMany: async ({
        orderBy,
        take,
      }: {
        orderBy?: { createdAt?: 'asc' | 'desc' };
        take?: number;
      }) => {
        const ordered = [...auditEvents];

        if (orderBy?.createdAt === 'asc') {
          ordered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        } else {
          ordered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        if (typeof take === 'number') {
          return ordered.slice(0, take).map((item) => copyEntity(item));
        }

        return ordered.map((item) => copyEntity(item));
      },
    },

    $disconnect: async () => undefined,
  };

  return prisma;
}
