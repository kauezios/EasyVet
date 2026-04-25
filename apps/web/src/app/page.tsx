'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type ApiMeta = {
  correlationId: string;
};

type ApiEnvelope<T> = {
  data: T;
  meta: ApiMeta;
};

type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
  meta: ApiMeta;
};

type ActorRole = 'ADMIN' | 'VETERINARIAN' | 'RECEPTION';
type PatientSex = 'MALE' | 'FEMALE' | 'UNKNOWN';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: ActorRole;
  active: boolean;
};

type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
};

type Tutor = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
};

type Patient = {
  id: string;
  tutorId: string;
  name: string;
  species: string;
  breed: string | null;
  sex?: PatientSex | null;
  birthDate?: string | null;
  currentWeight?: number | null;
};

type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED'
  | 'NO_SHOW';

type Appointment = {
  id: string;
  patientId: string;
  tutorId: string;
  veterinarianName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: AppointmentStatus;
  notes: string | null;
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
  };
};

type MedicalRecordStatus = 'DRAFT' | 'FINALIZED';

type MedicalRecord = {
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
  recommendedReturnAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type MedicalRecordFormState = {
  chiefComplaint: string;
  symptomsOnset: string;
  clinicalHistory: string;
  physicalExam: string;
  presumptiveDiagnosis: string;
  conduct: string;
  guidance: string;
  recommendedReturnAt: string;
};

type AccessProfile = {
  id: string;
  name: string;
  email: string;
  role: ActorRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditEvent = {
  id: string;
  actorId: string | null;
  entity: string;
  entityId: string;
  action: string;
  summary: string | null;
  createdAt: string;
};

type InactivityPolicySnapshot = {
  enabled: boolean;
  maxInactiveDays: number;
  excludedRoles: ActorRole[];
  cutoffDate: string;
};

type InactiveUserCandidate = {
  id: string;
  name: string;
  email: string;
  role: ActorRole;
  active: boolean;
  lastLoginAt: string | null;
  inactiveSince: string;
};

type InactivityScanResult = {
  dryRun: boolean;
  policy: InactivityPolicySnapshot;
  evaluatedUsers: number;
  matchedUsers: number;
  updatedUsers: number;
  affectedUsers: InactiveUserCandidate[];
};

type InactivityPolicyFormState = {
  enabled: boolean;
  maxInactiveDays: string;
  excludedRoles: ActorRole[];
};

type WorkspaceSection =
  | 'consultations'
  | 'medicalRecords'
  | 'scheduling'
  | 'users'
  | 'audit'
  | 'patients'
  | 'settings';

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
  roleOverride?: ActorRole;
  tokenOverride?: string;
};

type DemoDataset = {
  tutors: Tutor[];
  patients: Patient[];
  appointments: Appointment[];
  profiles: AccessProfile[];
  auditEvents: AuditEvent[];
  medicalRecordsByAppointment: Record<string, MedicalRecord>;
};

type SectionItem = {
  id: WorkspaceSection;
  label: string;
  description: string;
};

type ClinicScheduleSettings = {
  consultationDurationMinutes: number;
  openingTime: string;
  closingTime: string;
};

type SlotAvailability = {
  time: string;
  blocked: boolean;
  appointment: Appointment | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const ROLE_LABEL: Record<ActorRole, string> = {
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinario',
  RECEPTION: 'Recepcao',
};

const SECTION_ITEMS: SectionItem[] = [
  {
    id: 'consultations',
    label: 'Consultas',
    description: 'Agenda clinica do dia e status dos atendimentos.',
  },
  {
    id: 'medicalRecords',
    label: 'Prontuario',
    description: 'Documentacao clinica dos atendimentos em andamento.',
  },
  {
    id: 'scheduling',
    label: 'Agendamentos',
    description: 'Crie novas consultas em uma pagina dedicada.',
  },
  {
    id: 'users',
    label: 'Cadastrar usuario',
    description: 'Gestao de perfis de acesso da equipe.',
  },
  {
    id: 'audit',
    label: 'Auditoria',
    description: 'Eventos sensiveis de seguranca e operacao.',
  },
  {
    id: 'patients',
    label: 'Pacientes',
    description: 'Visualizacao de pacientes e respectivos tutores.',
  },
  {
    id: 'settings',
    label: 'Configuracoes',
    description: 'Preferencias operacionais do EasyVet.',
  },
];

const STATUS_VISUAL: Record<
  AppointmentStatus,
  { label: string; textClass: string; dotClass: string }
> = {
  SCHEDULED: {
    label: 'Agendada',
    textClass: 'text-slate-700',
    dotClass: 'bg-slate-400',
  },
  CONFIRMED: {
    label: 'Confirmada',
    textClass: 'text-cyan-700',
    dotClass: 'bg-cyan-500',
  },
  IN_PROGRESS: {
    label: 'Em atendimento',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  COMPLETED: {
    label: 'Concluida',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  CANCELED: {
    label: 'Cancelada',
    textClass: 'text-rose-700',
    dotClass: 'bg-rose-500',
  },
  NO_SHOW: {
    label: 'Nao compareceu',
    textClass: 'text-fuchsia-700',
    dotClass: 'bg-fuchsia-500',
  },
};

const MEDICAL_RECORD_STATUS_VISUAL: Record<
  MedicalRecordStatus,
  { label: string; textClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Rascunho',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  FINALIZED: {
    label: 'Finalizado',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
};

const DEMO_CREDENTIALS: Array<{
  email: string;
  password: string;
  user: AuthUser;
}> = [
  {
    email: 'admin@easyvet.local',
    password: 'easyvet123',
    user: {
      id: 'demo-user-admin',
      name: 'Administrador EasyVet',
      email: 'admin@easyvet.local',
      role: 'ADMIN',
      active: true,
    },
  },
  {
    email: 'vet@easyvet.local',
    password: 'easyvet123',
    user: {
      id: 'demo-user-vet',
      name: 'Veterinario EasyVet',
      email: 'vet@easyvet.local',
      role: 'VETERINARIAN',
      active: true,
    },
  },
  {
    email: 'recepcao@easyvet.local',
    password: 'easyvet123',
    user: {
      id: 'demo-user-reception',
      name: 'Recepcao EasyVet',
      email: 'recepcao@easyvet.local',
      role: 'RECEPTION',
      active: true,
    },
  },
];

const SCHEDULING_DAYS_WINDOW = 10;
const DEFAULT_CLINIC_SETTINGS: ClinicScheduleSettings = {
  consultationDurationMinutes: 30,
  openingTime: '08:00',
  closingTime: '18:00',
};

function toLocalISODate(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatDayLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00`);

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatShortDateLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatWeekdayShort(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  }).format(date);
}

function formatTime(dateIso: string): string {
  return new Date(dateIso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeInputFromDateTime(dateIso: string): string {
  const date = new Date(dateIso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function formatDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function joinDateAndTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function addMinutesToDate(dateIso: string, time: string, minutesToAdd: number): string {
  const absoluteMinutes = timeToMinutes(time) + minutesToAdd;
  const normalized = minutesToTime(absoluteMinutes);
  return joinDateAndTime(dateIso, normalized);
}

function buildDateWindow(days: number): string[] {
  const output: string[] = [];
  const today = new Date();

  for (let index = 0; index < days; index += 1) {
    const target = new Date(today);
    target.setDate(today.getDate() + index);
    output.push(toLocalISODate(target));
  }

  return output;
}

function generateDailySlots(
  openingTime: string,
  closingTime: string,
  durationMinutes: number,
): string[] {
  const startMinutes = timeToMinutes(openingTime);
  const endMinutes = timeToMinutes(closingTime);
  const slots: string[] = [];

  for (
    let current = startMinutes;
    current + durationMinutes <= endMinutes;
    current += durationMinutes
  ) {
    slots.push(minutesToTime(current));
  }

  return slots;
}

function clinicSettingsAreEqual(
  first: ClinicScheduleSettings,
  second: ClinicScheduleSettings,
): boolean {
  return (
    first.consultationDurationMinutes === second.consultationDurationMinutes &&
    first.openingTime === second.openingTime &&
    first.closingTime === second.closingTime
  );
}

function shouldBlockSlotByStatus(status: AppointmentStatus): boolean {
  return status !== 'CANCELED';
}

function buildSlotsAvailability(
  dateIso: string,
  slots: string[],
  durationMinutes: number,
  appointments: Appointment[],
  options?: {
    ignoreCanceledAppointments?: boolean;
    ignoreAppointmentId?: string;
  },
): SlotAvailability[] {
  return slots.map((slot) => {
    const slotStart = new Date(joinDateAndTime(dateIso, slot));
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

    const appointment = appointments.find((item) => {
      if (options?.ignoreAppointmentId && item.id === options.ignoreAppointmentId) {
        return false;
      }

      if (
        options?.ignoreCanceledAppointments &&
        !shouldBlockSlotByStatus(item.status)
      ) {
        return false;
      }

      const appointmentStart = new Date(item.startsAt);
      const appointmentEnd = new Date(item.endsAt);
      return slotStart < appointmentEnd && slotEnd > appointmentStart;
    });

    return {
      time: slot,
      blocked: Boolean(appointment),
      appointment: appointment ?? null,
    };
  });
}

function sortAppointments(data: Appointment[]): Appointment[] {
  return [...data].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
  });
}

function sortAppointmentsDescending(data: Appointment[]): Appointment[] {
  return [...data].sort((first, second) => {
    return new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime();
  });
}

function mergeUniqueAppointments(
  base: Appointment[],
  groupedByDate: Record<string, Appointment[]>,
): Appointment[] {
  const map = new Map<string, Appointment>();

  base.forEach((appointment) => {
    map.set(appointment.id, appointment);
  });

  Object.values(groupedByDate).forEach((dayAppointments) => {
    dayAppointments.forEach((appointment) => {
      map.set(appointment.id, appointment);
    });
  });

  return sortAppointments(Array.from(map.values()));
}

function createEmptyMedicalRecordFormState(): MedicalRecordFormState {
  return {
    chiefComplaint: '',
    symptomsOnset: '',
    clinicalHistory: '',
    physicalExam: '',
    presumptiveDiagnosis: '',
    conduct: '',
    guidance: '',
    recommendedReturnAt: '',
  };
}

function formatDateToInput(dateIso: string | null): string {
  if (!dateIso) {
    return '';
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function buildMedicalRecordFormFromRecord(
  record: MedicalRecord | null,
): MedicalRecordFormState {
  if (!record) {
    return createEmptyMedicalRecordFormState();
  }

  return {
    chiefComplaint: record.chiefComplaint ?? '',
    symptomsOnset: record.symptomsOnset ?? '',
    clinicalHistory: record.clinicalHistory ?? '',
    physicalExam: record.physicalExam ?? '',
    presumptiveDiagnosis: record.presumptiveDiagnosis ?? '',
    conduct: record.conduct ?? '',
    guidance: record.guidance ?? '',
    recommendedReturnAt: formatDateToInput(record.recommendedReturnAt),
  };
}

function buildRecommendedReturnAtIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function buildMedicalRecordPayload(form: MedicalRecordFormState): {
  chiefComplaint?: string;
  symptomsOnset?: string;
  clinicalHistory?: string;
  physicalExam?: string;
  presumptiveDiagnosis?: string;
  conduct?: string;
  guidance?: string;
  recommendedReturnAt?: string;
} {
  return {
    chiefComplaint: normalizeOptionalText(form.chiefComplaint),
    symptomsOnset: normalizeOptionalText(form.symptomsOnset),
    clinicalHistory: normalizeOptionalText(form.clinicalHistory),
    physicalExam: normalizeOptionalText(form.physicalExam),
    presumptiveDiagnosis: normalizeOptionalText(form.presumptiveDiagnosis),
    conduct: normalizeOptionalText(form.conduct),
    guidance: normalizeOptionalText(form.guidance),
    recommendedReturnAt: buildRecommendedReturnAtIso(form.recommendedReturnAt),
  };
}

function canFinalizeMedicalRecord(form: MedicalRecordFormState): boolean {
  const requiredValues = [
    form.chiefComplaint,
    form.symptomsOnset,
    form.clinicalHistory,
    form.physicalExam,
    form.presumptiveDiagnosis,
    form.conduct,
    form.guidance,
  ];

  return requiredValues.every((value) => value.trim().length > 0);
}

function buildInactivityPolicyFormState(
  policy: InactivityPolicySnapshot,
): InactivityPolicyFormState {
  return {
    enabled: policy.enabled,
    maxInactiveDays: String(policy.maxInactiveDays),
    excludedRoles: [...policy.excludedRoles],
  };
}

function roleListAsKey(roles: ActorRole[]): string {
  return [...roles].sort().join('|');
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.includes('AUTH_INVALID_CREDENTIALS')) {
    return 'E-mail ou senha invalidos.';
  }

  if (error.message.includes('AUTH_ACCOUNT_LOCKED')) {
    return 'Conta bloqueada temporariamente por tentativas invalidas. Aguarde alguns minutos e tente novamente.';
  }

  if (error.message.includes('AUTH_PASSWORD_POLICY_INVALID')) {
    return 'Senha fora da politica de seguranca da clinica.';
  }

  if (error.message.includes('PROFILE_SELF_DEACTIVATE_NOT_ALLOWED')) {
    return 'Para seguranca, nao e permitido inativar o usuario da sessao atual.';
  }

  if (error.message.includes('API_TIMEOUT')) {
    return 'API indisponivel no momento (timeout).';
  }

  if (error.message.includes('NETWORK_ERROR')) {
    return 'API indisponivel no momento (erro de conexao).';
  }

  if (error.message.includes('INTERNAL_SERVER_ERROR')) {
    return 'API indisponivel no momento (erro interno).';
  }

  return error.message;
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeDocument(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function normalizeOptionalWeight(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatSexLabel(sex?: PatientSex | null): string {
  if (sex === 'MALE') {
    return 'Macho';
  }

  if (sex === 'FEMALE') {
    return 'Femea';
  }

  return 'Nao informado';
}

function createDemoDataset(date: string, fallbackVetName: string): DemoDataset {
  const tutors: Tutor[] = [
    {
      id: 'demo-tutor-1',
      name: 'Marina Araujo',
      document: '123.456.789-10',
      phone: '(11) 99999-1001',
      email: 'marina@example.com',
      address: 'Rua das Hortensias, 120',
    },
    {
      id: 'demo-tutor-2',
      name: 'Carlos Mendes',
      document: '987.654.321-00',
      phone: '(11) 98888-2202',
      email: 'carlos@example.com',
      address: 'Av. Paulista, 2300',
    },
    {
      id: 'demo-tutor-3',
      name: 'Bianca Costa',
      document: '045.367.810-02',
      phone: '(11) 97777-7733',
      email: 'bianca@example.com',
      address: 'Rua do Bosque, 58',
    },
  ];

  const patients: Patient[] = [
    {
      id: 'demo-patient-1',
      tutorId: 'demo-tutor-1',
      name: 'Thor',
      species: 'Canino',
      breed: 'Labrador',
      sex: 'MALE',
      birthDate: '2021-02-18T00:00:00.000Z',
      currentWeight: 27.4,
    },
    {
      id: 'demo-patient-2',
      tutorId: 'demo-tutor-2',
      name: 'Mia',
      species: 'Felino',
      breed: 'Siames',
      sex: 'FEMALE',
      birthDate: '2022-08-07T00:00:00.000Z',
      currentWeight: 4.1,
    },
    {
      id: 'demo-patient-3',
      tutorId: 'demo-tutor-3',
      name: 'Luna',
      species: 'Canino',
      breed: 'Shih Tzu',
      sex: 'FEMALE',
      birthDate: '2020-06-14T00:00:00.000Z',
      currentWeight: 6.8,
    },
  ];

  const appointments: Appointment[] = [
    {
      id: 'demo-appt-1',
      patientId: 'demo-patient-1',
      tutorId: 'demo-tutor-1',
      veterinarianName: fallbackVetName,
      startsAt: `${date}T09:00:00`,
      endsAt: `${date}T09:30:00`,
      reason: 'Consulta de rotina',
      status: 'IN_PROGRESS',
      notes: null,
      patient: {
        id: 'demo-patient-1',
        name: 'Thor',
        species: 'Canino',
        breed: 'Labrador',
      },
      tutor: {
        id: 'demo-tutor-1',
        name: 'Marina Araujo',
        phone: '(11) 99999-1001',
      },
    },
    {
      id: 'demo-appt-2',
      patientId: 'demo-patient-2',
      tutorId: 'demo-tutor-2',
      veterinarianName: fallbackVetName,
      startsAt: `${date}T10:30:00`,
      endsAt: `${date}T11:00:00`,
      reason: 'Retorno dermatologico',
      status: 'SCHEDULED',
      notes: null,
      patient: {
        id: 'demo-patient-2',
        name: 'Mia',
        species: 'Felino',
        breed: 'Siames',
      },
      tutor: {
        id: 'demo-tutor-2',
        name: 'Carlos Mendes',
        phone: '(11) 98888-2202',
      },
    },
    {
      id: 'demo-appt-3',
      patientId: 'demo-patient-3',
      tutorId: 'demo-tutor-3',
      veterinarianName: fallbackVetName,
      startsAt: `${date}T14:00:00`,
      endsAt: `${date}T14:30:00`,
      reason: 'Vacina anual',
      status: 'CONFIRMED',
      notes: null,
      patient: {
        id: 'demo-patient-3',
        name: 'Luna',
        species: 'Canino',
        breed: 'Shih Tzu',
      },
      tutor: {
        id: 'demo-tutor-3',
        name: 'Bianca Costa',
        phone: '(11) 97777-7733',
      },
    },
  ];

  const now = new Date().toISOString();

  const profiles: AccessProfile[] = [
    {
      id: 'demo-user-admin',
      name: 'Administrador EasyVet',
      email: 'admin@easyvet.local',
      role: 'ADMIN',
      active: true,
      lastLoginAt: new Date(new Date(now).getTime() - 1000 * 60 * 30).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-user-vet',
      name: 'Veterinario EasyVet',
      email: 'vet@easyvet.local',
      role: 'VETERINARIAN',
      active: true,
      lastLoginAt: new Date(new Date(now).getTime() - 1000 * 60 * 60 * 26).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-user-reception',
      name: 'Recepcao EasyVet',
      email: 'recepcao@easyvet.local',
      role: 'RECEPTION',
      active: true,
      lastLoginAt: new Date(
        new Date(now).getTime() - 1000 * 60 * 60 * 24 * 140,
      ).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: 'demo-audit-1',
      actorId: 'demo-user-admin',
      entity: 'AUTH',
      entityId: 'demo-user-admin',
      action: 'LOGIN_SUCCESS',
      summary: 'Acesso autenticado com sucesso',
      createdAt: new Date(new Date(now).getTime() - 1000 * 60 * 6).toISOString(),
    },
    {
      id: 'demo-audit-2',
      actorId: 'demo-user-admin',
      entity: 'USER',
      entityId: 'demo-user-vet',
      action: 'ROLE_CHANGED',
      summary: 'Papel alterado de RECEPTION para VETERINARIAN',
      createdAt: new Date(new Date(now).getTime() - 1000 * 60 * 21).toISOString(),
    },
    {
      id: 'demo-audit-3',
      actorId: 'demo-user-vet',
      entity: 'MEDICAL_RECORD',
      entityId: 'demo-record-1',
      action: 'MEDICAL_RECORD_FINALIZED',
      summary: 'Prontuario finalizado para consulta demo-appt-1',
      createdAt: new Date(new Date(now).getTime() - 1000 * 60 * 39).toISOString(),
    },
  ];

  const medicalRecordsByAppointment: Record<string, MedicalRecord> = {
    'demo-appt-1': {
      id: 'demo-record-1',
      appointmentId: 'demo-appt-1',
      status: 'DRAFT',
      chiefComplaint: 'Prurido em regiao cervical',
      symptomsOnset: 'Ha 3 dias',
      clinicalHistory: 'Paciente ativo, sem alteracao de apetite.',
      physicalExam: null,
      presumptiveDiagnosis: null,
      conduct: null,
      guidance: null,
      recommendedReturnAt: null,
      finalizedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  };

  return {
    tutors,
    patients,
    appointments,
    profiles,
    auditEvents,
    medicalRecordsByAppointment,
  };
}

export default function Home() {
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [authForm, setAuthForm] = useState({
    email: 'vet@easyvet.local',
    password: 'easyvet123',
  });

  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('consultations');
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalISODate(new Date()),
  );
  const [schedulingDate, setSchedulingDate] = useState<string>(
    toLocalISODate(new Date()),
  );
  const [clinicSettings, setClinicSettings] = useState<ClinicScheduleSettings>(
    DEFAULT_CLINIC_SETTINGS,
  );
  const [savedClinicSettings, setSavedClinicSettings] =
    useState<ClinicScheduleSettings>(DEFAULT_CLINIC_SETTINGS);

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, Appointment[]>
  >({});
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [inactivityPolicy, setInactivityPolicy] =
    useState<InactivityPolicySnapshot | null>(null);
  const [inactivityPolicyForm, setInactivityPolicyForm] =
    useState<InactivityPolicyFormState>({
      enabled: true,
      maxInactiveDays: '90',
      excludedRoles: ['ADMIN'],
    });
  const [lastInactivityScanResult, setLastInactivityScanResult] =
    useState<InactivityScanResult | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditReferenceNow, setAuditReferenceNow] = useState(0);
  const [demoMedicalRecordsByAppointment, setDemoMedicalRecordsByAppointment] =
    useState<Record<string, MedicalRecord>>({});
  const [selectedConsultationId, setSelectedConsultationId] = useState('');
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    toLocalISODate(new Date()),
  );
  const [rescheduleStartsAt, setRescheduleStartsAt] = useState('');
  const [selectedMedicalRecord, setSelectedMedicalRecord] =
    useState<MedicalRecord | null>(null);
  const [medicalRecordForm, setMedicalRecordForm] = useState<MedicalRecordFormState>(
    createEmptyMedicalRecordFormState(),
  );
  const [patientHistoryAppointments, setPatientHistoryAppointments] = useState<
    Appointment[]
  >([]);
  const [patientHistorySearch, setPatientHistorySearch] = useState('');

  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isInactivityScanRunning, setIsInactivityScanRunning] = useState(false);
  const [isInactivityPolicySaving, setIsInactivityPolicySaving] = useState(false);
  const [isRescheduleSaving, setIsRescheduleSaving] = useState(false);
  const [isAppointmentSaving, setIsAppointmentSaving] = useState(false);
  const [isPatientSaving, setIsPatientSaving] = useState(false);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [isClinicSettingsSaving, setIsClinicSettingsSaving] = useState(false);
  const [isMedicalRecordLoading, setIsMedicalRecordLoading] = useState(false);
  const [isMedicalRecordSaving, setIsMedicalRecordSaving] = useState(false);
  const [isMedicalRecordFinalizing, setIsMedicalRecordFinalizing] = useState(false);
  const [isPatientHistoryLoading, setIsPatientHistoryLoading] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [profileStatusSavingId, setProfileStatusSavingId] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    veterinarianName: '',
    startsAt: '09:00',
    reason: '',
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    role: 'VETERINARIAN' as ActorRole,
    password: 'easyvet123',
  });

  const [patientForm, setPatientForm] = useState({
    tutorDocument: '',
    tutorResolvedId: '',
    tutorName: '',
    tutorPhone: '',
    tutorEmail: '',
    tutorAddress: '',
    name: '',
    species: '',
    breed: '',
    sex: 'UNKNOWN' as PatientSex,
    birthDate: '',
    currentWeight: '',
  });

  const request = useCallback(
    async <T,>(path: string, options?: ApiRequestOptions): Promise<T> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, options?.timeoutMs ?? 5000);

      try {
        const headers = new Headers(options?.headers ?? {});

        if (options?.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        if (!headers.has('x-user-role')) {
          headers.set(
            'x-user-role',
            options?.roleOverride ?? authUser?.role ?? 'VETERINARIAN',
          );
        }

        const authTokenToUse = options?.tokenOverride ?? authToken;
        if (!options?.skipAuth && authTokenToUse) {
          headers.set('Authorization', `Bearer ${authTokenToUse}`);
        }

        const response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
          cache: 'no-store',
        });

        let payload: ApiEnvelope<T> | ApiErrorEnvelope | null = null;

        try {
          payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
        } catch {
          payload = null;
        }

        if (!response.ok) {
          if (payload && 'error' in payload) {
            const details = payload.error.details
              ?.map((detail) => `${detail.field}: ${detail.issue}`)
              .join(', ');

            if (details) {
              throw new Error(
                `${payload.error.code}: ${payload.error.message} (${details})`,
              );
            }

            throw new Error(`${payload.error.code}: ${payload.error.message}`);
          }

          throw new Error(`HTTP_ERROR_${response.status}: falha na requisicao`);
        }

        if (!payload || !('data' in payload)) {
          throw new Error('API_INVALID_RESPONSE: resposta invalida da API');
        }

        return payload.data;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('API_TIMEOUT: tempo limite de resposta excedido');
        }

        if (error instanceof TypeError) {
          throw new Error('NETWORK_ERROR: nao foi possivel conectar na API');
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    [authToken, authUser],
  );

  const canManageUsers = authUser?.role === 'ADMIN';

  const activeSectionMeta = useMemo(() => {
    return SECTION_ITEMS.find((item) => item.id === activeSection) ?? SECTION_ITEMS[0];
  }, [activeSection]);

  const sortedAppointments = useMemo(
    () => sortAppointments(appointments),
    [appointments],
  );

  const selectedConsultation = useMemo(() => {
    return (
      sortedAppointments.find((item) => item.id === selectedConsultationId) ?? null
    );
  }, [selectedConsultationId, sortedAppointments]);

  const nextConsultation = useMemo(() => {
    const queueStatuses: AppointmentStatus[] = [
      'SCHEDULED',
      'CONFIRMED',
      'IN_PROGRESS',
    ];

    const queuedAppointments = sortedAppointments.filter((item) =>
      queueStatuses.includes(item.status),
    );

    if (queuedAppointments.length === 0) {
      return null;
    }

    const now = new Date();
    const upcoming = queuedAppointments.find((item) => {
      return new Date(item.startsAt) >= now;
    });

    return upcoming ?? queuedAppointments[0];
  }, [sortedAppointments]);

  const selectedConsultationIsFinalizedRecord =
    selectedMedicalRecord?.status === 'FINALIZED';

  const medicalRecordCanFinalize = useMemo(() => {
    if (selectedConsultationIsFinalizedRecord) {
      return false;
    }

    return canFinalizeMedicalRecord(medicalRecordForm);
  }, [medicalRecordForm, selectedConsultationIsFinalizedRecord]);

  const filteredPatientHistory = useMemo(() => {
    const search = patientHistorySearch.trim().toLowerCase();
    const history = sortAppointmentsDescending(patientHistoryAppointments);

    if (!search) {
      return history;
    }

    return history.filter((appointment) => {
      const searchable = [
        appointment.reason,
        appointment.veterinarianName,
        appointment.patient.name,
        appointment.tutor.name,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [patientHistoryAppointments, patientHistorySearch]);

  const filteredAuditEvents = useMemo(() => {
    const search = auditSearch.trim().toLowerCase();
    const sorted = [...auditEvents].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    );

    return sorted.filter((event) => {
      if (auditEntityFilter !== 'ALL' && event.entity !== auditEntityFilter) {
        return false;
      }

      if (auditActionFilter !== 'ALL' && event.action !== auditActionFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchable = [
        event.action,
        event.entity,
        event.entityId,
        event.summary ?? '',
        event.actorId ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [auditActionFilter, auditEntityFilter, auditEvents, auditSearch]);

  const auditEntityOptions = useMemo(() => {
    return Array.from(new Set(auditEvents.map((event) => event.entity))).sort(
      (first, second) => first.localeCompare(second),
    );
  }, [auditEvents]);

  const auditActionOptions = useMemo(() => {
    return Array.from(new Set(auditEvents.map((event) => event.action))).sort(
      (first, second) => first.localeCompare(second),
    );
  }, [auditEvents]);

  const auditSummary = useMemo(() => {
    const reference = auditReferenceNow > 0 ? auditReferenceNow : 0;
    const twentyFourHoursAgo = reference - 24 * 60 * 60 * 1000;

    const eventsLast24h = auditEvents.filter(
      (event) => new Date(event.createdAt).getTime() >= twentyFourHoursAgo,
    );
    const riskEventsLast24h = eventsLast24h.filter((event) =>
      isRiskAuditAction(event.action),
    );
    const uniqueActorsLast24h = new Set(
      eventsLast24h.map((event) => event.actorId ?? 'SYSTEM'),
    ).size;

    const latestEvent = [...auditEvents].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    )[0];

    return {
      totalEvents: auditEvents.length,
      eventsInView: filteredAuditEvents.length,
      eventsLast24h: eventsLast24h.length,
      riskEventsLast24h: riskEventsLast24h.length,
      uniqueActorsLast24h,
      latestEventAt: latestEvent?.createdAt ?? null,
    };
  }, [auditEvents, auditReferenceNow, filteredAuditEvents]);

  const riskAuditEvents = useMemo(() => {
    return filteredAuditEvents
      .filter((event) => isRiskAuditAction(event.action))
      .slice(0, 4);
  }, [filteredAuditEvents]);

  const appointmentMetrics = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((item) => item.status === 'SCHEDULED').length;
    const inProgress = appointments.filter(
      (item) => item.status === 'IN_PROGRESS',
    ).length;
    const finished = appointments.filter((item) => item.status === 'COMPLETED').length;

    return {
      total,
      pending,
      inProgress,
      finished,
    };
  }, [appointments]);

  const profileMetrics = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((profile) => profile.active).length;
    const inactive = profiles.filter((profile) => !profile.active).length;

    return {
      total,
      active,
      inactive,
    };
  }, [profiles]);

  const inactivityPolicyMaxDaysError = useMemo(() => {
    const parsed = Number(inactivityPolicyForm.maxInactiveDays);

    if (!Number.isInteger(parsed)) {
      return 'Defina um limite inteiro de dias.';
    }

    if (parsed < 1 || parsed > 3650) {
      return 'O limite deve ficar entre 1 e 3650 dias.';
    }

    return '';
  }, [inactivityPolicyForm.maxInactiveDays]);

  const hasPendingInactivityPolicyChanges = useMemo(() => {
    if (!inactivityPolicy) {
      return false;
    }

    if (inactivityPolicy.enabled !== inactivityPolicyForm.enabled) {
      return true;
    }

    if (
      inactivityPolicy.maxInactiveDays !== Number(inactivityPolicyForm.maxInactiveDays)
    ) {
      return true;
    }

    return (
      roleListAsKey(inactivityPolicy.excludedRoles) !==
      roleListAsKey(inactivityPolicyForm.excludedRoles)
    );
  }, [inactivityPolicy, inactivityPolicyForm]);

  const patientOptions = useMemo(() => {
    return patients.map((patient) => {
      const tutor = tutors.find((item) => item.id === patient.tutorId);

      return {
        id: patient.id,
        label: `${patient.name} - ${tutor?.name ?? 'Tutor'}`,
      };
    });
  }, [patients, tutors]);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((first, second) => first.name.localeCompare(second.name));
  }, [patients]);

  const sortedTutors = useMemo(() => {
    return sortTutors(tutors);
  }, [tutors]);

  const schedulingDatesWindow = useMemo(() => {
    return buildDateWindow(SCHEDULING_DAYS_WINDOW);
  }, []);

  const dailySlots = useMemo(() => {
    return generateDailySlots(
      clinicSettings.openingTime,
      clinicSettings.closingTime,
      clinicSettings.consultationDurationMinutes,
    );
  }, [
    clinicSettings.closingTime,
    clinicSettings.consultationDurationMinutes,
    clinicSettings.openingTime,
  ]);

  const appointmentsForSchedulingDate = useMemo(() => {
    return appointmentsByDate[schedulingDate] ?? [];
  }, [appointmentsByDate, schedulingDate]);

  const schedulingSlotsAvailability = useMemo(() => {
    return buildSlotsAvailability(
      schedulingDate,
      dailySlots,
      clinicSettings.consultationDurationMinutes,
      appointmentsForSchedulingDate,
      {
        ignoreCanceledAppointments: true,
      },
    );
  }, [
    appointmentsForSchedulingDate,
    clinicSettings.consultationDurationMinutes,
    dailySlots,
    schedulingDate,
  ]);

  const nextFreeSlot = useMemo(() => {
    return schedulingSlotsAvailability.find((slot) => !slot.blocked)?.time ?? '';
  }, [schedulingSlotsAvailability]);

  const schedulingDaySummaries = useMemo(() => {
    return schedulingDatesWindow.map((dateIso) => {
      const isLoaded = dateIso in appointmentsByDate;
      const dateAppointments = appointmentsByDate[dateIso] ?? [];
      const slots = buildSlotsAvailability(
        dateIso,
        dailySlots,
        clinicSettings.consultationDurationMinutes,
        dateAppointments,
        {
          ignoreCanceledAppointments: true,
        },
      );
      const freeCount = slots.filter((slot) => !slot.blocked).length;

      return {
        dateIso,
        isLoaded,
        freeCount,
      };
    });
  }, [
    appointmentsByDate,
    clinicSettings.consultationDurationMinutes,
    dailySlots,
    schedulingDatesWindow,
  ]);

  const consultationsCalendarSlots = useMemo(() => {
    return buildSlotsAvailability(
      selectedDate,
      dailySlots,
      clinicSettings.consultationDurationMinutes,
      sortedAppointments,
    );
  }, [
    clinicSettings.consultationDurationMinutes,
    dailySlots,
    selectedDate,
    sortedAppointments,
  ]);

  const knownAppointments = useMemo(() => {
    return mergeUniqueAppointments(appointments, appointmentsByDate);
  }, [appointments, appointmentsByDate]);

  const rescheduleTargetAppointment = useMemo(() => {
    return (
      knownAppointments.find((appointment) => appointment.id === rescheduleAppointmentId) ??
      null
    );
  }, [knownAppointments, rescheduleAppointmentId]);

  const appointmentsForRescheduleDate = useMemo(() => {
    return appointmentsByDate[rescheduleDate] ?? [];
  }, [appointmentsByDate, rescheduleDate]);

  const rescheduleSlotsAvailability = useMemo(() => {
    if (!rescheduleTargetAppointment) {
      return [] as SlotAvailability[];
    }

    return buildSlotsAvailability(
      rescheduleDate,
      dailySlots,
      clinicSettings.consultationDurationMinutes,
      appointmentsForRescheduleDate,
      {
        ignoreCanceledAppointments: true,
        ignoreAppointmentId: rescheduleTargetAppointment.id,
      },
    );
  }, [
    appointmentsForRescheduleDate,
    clinicSettings.consultationDurationMinutes,
    dailySlots,
    rescheduleDate,
    rescheduleTargetAppointment,
  ]);

  const rescheduleDaySummaries = useMemo(() => {
    if (!rescheduleTargetAppointment) {
      return [] as Array<{ dateIso: string; freeCount: number; isLoaded: boolean }>;
    }

    return schedulingDatesWindow.map((dateIso) => {
      const isLoaded = dateIso in appointmentsByDate;
      const dateAppointments = appointmentsByDate[dateIso] ?? [];
      const slots = buildSlotsAvailability(
        dateIso,
        dailySlots,
        clinicSettings.consultationDurationMinutes,
        dateAppointments,
        {
          ignoreCanceledAppointments: true,
          ignoreAppointmentId: rescheduleTargetAppointment.id,
        },
      );
      const freeCount = slots.filter((slot) => !slot.blocked).length;

      return {
        dateIso,
        freeCount,
        isLoaded,
      };
    });
  }, [
    appointmentsByDate,
    clinicSettings.consultationDurationMinutes,
    dailySlots,
    rescheduleTargetAppointment,
    schedulingDatesWindow,
  ]);

  const clinicScheduleValidationError = useMemo(() => {
    const openingMinutes = timeToMinutes(clinicSettings.openingTime);
    const closingMinutes = timeToMinutes(clinicSettings.closingTime);

    if (
      Number.isNaN(openingMinutes) ||
      Number.isNaN(closingMinutes) ||
      openingMinutes >= closingMinutes
    ) {
      return 'O horario de inicio precisa ser menor que o horario de termino.';
    }

    const scheduleWindowMinutes = closingMinutes - openingMinutes;
    if (scheduleWindowMinutes < clinicSettings.consultationDurationMinutes) {
      return 'A duracao da consulta nao pode exceder a janela de expediente.';
    }

    return '';
  }, [clinicSettings]);

  const hasPendingClinicSettingsChanges = useMemo(() => {
    return !clinicSettingsAreEqual(clinicSettings, savedClinicSettings);
  }, [clinicSettings, savedClinicSettings]);

  const selectedTutorByDocument = useMemo(() => {
    const resolvedById = sortedTutors.find(
      (tutor) => tutor.id === patientForm.tutorResolvedId,
    );
    if (resolvedById) {
      return resolvedById;
    }

    const normalizedDocument = normalizeDocument(patientForm.tutorDocument);
    if (!normalizedDocument) {
      return null;
    }

    return (
      sortedTutors.find((tutor) => {
        if (!tutor.document) {
          return false;
        }

        return normalizeDocument(tutor.document) === normalizedDocument;
      }) ?? null
    );
  }, [patientForm.tutorDocument, patientForm.tutorResolvedId, sortedTutors]);

  const isExistingTutorSelected = Boolean(selectedTutorByDocument);

  const loadAppointmentsForDate = useCallback(
    async (dateIso: string): Promise<Appointment[]> => {
      if (isDemoMode) {
        if (dateIso === selectedDate) {
          return sortAppointments(appointments);
        }

        return sortAppointments(appointmentsByDate[dateIso] ?? []);
      }

      const data = await request<Appointment[]>(`/appointments?date=${dateIso}`);
      return sortAppointments(data);
    },
    [appointments, appointmentsByDate, isDemoMode, request, selectedDate],
  );

  const ensureAppointmentsByDate = useCallback(
    async (dates: string[]) => {
      const missingDates = dates.filter((date) => !(date in appointmentsByDate));
      if (missingDates.length === 0) {
        return;
      }

      setIsAvailabilityLoading(true);
      try {
        const loaded = await Promise.all(
          missingDates.map(async (date) => {
            const data = await loadAppointmentsForDate(date);
            return [date, data] as const;
          }),
        );

        setAppointmentsByDate((current) => {
          const next = { ...current };
          loaded.forEach(([date, data]) => {
            next[date] = sortAppointments(data);
          });
          return next;
        });
      } catch (error) {
        setErrorMessage(
          normalizeErrorMessage(error, 'Falha ao carregar disponibilidade de agenda.'),
        );
      } finally {
        setIsAvailabilityLoading(false);
      }
    },
    [appointmentsByDate, loadAppointmentsForDate],
  );

  const patchAppointmentStatusLocally = useCallback(
    (appointmentId: string, status: AppointmentStatus) => {
      setAppointments((current) =>
        sortAppointments(
          current.map((item) => {
            if (item.id !== appointmentId) {
              return item;
            }

            return {
              ...item,
              status,
            };
          }),
        ),
      );

      setAppointmentsByDate((current) => {
        const next = { ...current };
        Object.entries(next).forEach(([date, dayAppointments]) => {
          if (!dayAppointments.some((item) => item.id === appointmentId)) {
            return;
          }

          next[date] = sortAppointments(
            dayAppointments.map((item) => {
              if (item.id !== appointmentId) {
                return item;
              }

              return {
                ...item,
                status,
              };
            }),
          );
        });

        return next;
      });

      setPatientHistoryAppointments((current) =>
        sortAppointments(
          current.map((item) => {
            if (item.id !== appointmentId) {
              return item;
            }

            return {
              ...item,
              status,
            };
          }),
        ),
      );
    },
    [],
  );

  const loadMedicalRecordForConsultation = useCallback(
    async (appointmentId: string) => {
      if (!appointmentId) {
        setSelectedMedicalRecord(null);
        setMedicalRecordForm(createEmptyMedicalRecordFormState());
        return;
      }

      setIsMedicalRecordLoading(true);

      try {
        if (isDemoMode) {
          const demoRecord = demoMedicalRecordsByAppointment[appointmentId] ?? null;
          setSelectedMedicalRecord(demoRecord);
          setMedicalRecordForm(buildMedicalRecordFormFromRecord(demoRecord));
          return;
        }

        const record = await request<MedicalRecord>(
          `/appointments/${appointmentId}/medical-record`,
        );
        setSelectedMedicalRecord(record);
        setMedicalRecordForm(buildMedicalRecordFormFromRecord(record));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('MEDICAL_RECORD_NOT_FOUND')
        ) {
          setSelectedMedicalRecord(null);
          setMedicalRecordForm(createEmptyMedicalRecordFormState());
          return;
        }

        setErrorMessage(
          normalizeErrorMessage(error, 'Falha ao carregar prontuario da consulta.'),
        );
      } finally {
        setIsMedicalRecordLoading(false);
      }
    },
    [demoMedicalRecordsByAppointment, isDemoMode, request],
  );

  const loadPatientHistory = useCallback(
    async (patientId: string) => {
      if (!patientId) {
        setPatientHistoryAppointments([]);
        return;
      }

      setIsPatientHistoryLoading(true);

      try {
        if (isDemoMode) {
          const knownAppointments = mergeUniqueAppointments(
            appointments,
            appointmentsByDate,
          );
          const history = knownAppointments.filter(
            (appointment) => appointment.patientId === patientId,
          );
          setPatientHistoryAppointments(sortAppointments(history));
          return;
        }

        const history = await request<Appointment[]>(
          `/appointments?patientId=${encodeURIComponent(patientId)}`,
        );
        setPatientHistoryAppointments(sortAppointments(history));
      } catch (error) {
        setErrorMessage(
          normalizeErrorMessage(
            error,
            'Falha ao carregar historico de consultas do paciente.',
          ),
        );
      } finally {
        setIsPatientHistoryLoading(false);
      }
    },
    [appointments, appointmentsByDate, isDemoMode, request],
  );

  const loadAuditEvents = useCallback(async () => {
    if (!authUser || authUser.role !== 'ADMIN') {
      setAuditEvents([]);
      setAuditReferenceNow(0);
      return;
    }

    setIsAuditLoading(true);

    try {
      if (isDemoMode) {
        const demoDataset = createDemoDataset(selectedDate, authUser.name);
        setAuditEvents(demoDataset.auditEvents);
        setAuditReferenceNow(getAuditReferenceTimestamp(demoDataset.auditEvents));
        return;
      }

      const data = await request<AuditEvent[]>('/audit-events?limit=120');
      setAuditEvents(data);
      setAuditReferenceNow(getAuditReferenceTimestamp(data));
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao carregar trilha de auditoria.'),
      );
    } finally {
      setIsAuditLoading(false);
    }
  }, [authUser, isDemoMode, request, selectedDate]);

  const loadInactivityPolicy = useCallback(async () => {
    if (!authUser || authUser.role !== 'ADMIN') {
      setInactivityPolicy(null);
      setInactivityPolicyForm({
        enabled: true,
        maxInactiveDays: '90',
        excludedRoles: ['ADMIN'],
      });
      return;
    }

    try {
      if (isDemoMode) {
        const demoPolicy: InactivityPolicySnapshot = {
          enabled: true,
          maxInactiveDays: 90,
          excludedRoles: ['ADMIN'],
          cutoffDate: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };
        setInactivityPolicy(demoPolicy);
        setInactivityPolicyForm(buildInactivityPolicyFormState(demoPolicy));
        return;
      }

      const policy = await request<InactivityPolicySnapshot>(
        '/profiles/inactivity-policy',
      );
      setInactivityPolicy(policy);
      setInactivityPolicyForm(buildInactivityPolicyFormState(policy));
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(
          error,
          'Falha ao carregar politica de inatividade de usuarios.',
        ),
      );
    }
  }, [authUser, isDemoMode, request]);

  const bootstrapWorkspace = useCallback(async () => {
    if (!authUser) {
      return;
    }

    setIsWorkspaceLoading(true);
    setErrorMessage('');

    try {
      const [tutorData, patientData, appointmentData] = await Promise.all([
        request<Tutor[]>('/tutors'),
        request<Patient[]>('/patients'),
        request<Appointment[]>(`/appointments?date=${selectedDate}`),
      ]);

      let scheduleData = DEFAULT_CLINIC_SETTINGS;
      try {
        scheduleData = await request<ClinicScheduleSettings>(
          '/clinic-settings/schedule',
        );
      } catch {
        scheduleData = DEFAULT_CLINIC_SETTINGS;
      }

      const sortedDayAppointments = sortAppointments(appointmentData);

      setTutors(tutorData);
      setPatients(patientData);
      setAppointments(sortedDayAppointments);
      setDemoMedicalRecordsByAppointment({});
      setSelectedMedicalRecord(null);
      setMedicalRecordForm(createEmptyMedicalRecordFormState());
      setPatientHistoryAppointments([]);
      setPatientHistorySearch('');
      setClinicSettings(scheduleData);
      setSavedClinicSettings(scheduleData);
      setAuditSearch('');
      setAuditEntityFilter('ALL');
      setAuditActionFilter('ALL');
      setAppointmentsByDate((current) => ({
        ...current,
        [selectedDate]: sortedDayAppointments,
      }));

      if (authUser.role === 'ADMIN') {
        const [profileData, auditData, inactivityPolicyData] = await Promise.all([
          request<AccessProfile[]>('/profiles'),
          request<AuditEvent[]>('/audit-events?limit=120'),
          request<InactivityPolicySnapshot>('/profiles/inactivity-policy'),
        ]);
        setProfiles(profileData);
        setAuditEvents(auditData);
        setAuditReferenceNow(getAuditReferenceTimestamp(auditData));
        setInactivityPolicy(inactivityPolicyData);
        setInactivityPolicyForm(buildInactivityPolicyFormState(inactivityPolicyData));
        setLastInactivityScanResult(null);
      } else {
        setProfiles([]);
        setAuditEvents([]);
        setAuditReferenceNow(0);
        setInactivityPolicy(null);
        setInactivityPolicyForm({
          enabled: true,
          maxInactiveDays: '90',
          excludedRoles: ['ADMIN'],
        });
        setLastInactivityScanResult(null);
      }

      setAppointmentForm((current) => ({
        ...current,
        patientId: current.patientId || patientData[0]?.id || '',
        veterinarianName: current.veterinarianName || authUser.name,
      }));

      setIsDemoMode(false);
    } catch {
      const demoDataset = createDemoDataset(selectedDate, authUser.name);

      setTutors(demoDataset.tutors);
      setPatients(demoDataset.patients);
      setAppointments(demoDataset.appointments);
      setDemoMedicalRecordsByAppointment(demoDataset.medicalRecordsByAppointment);
      setSelectedMedicalRecord(null);
      setMedicalRecordForm(createEmptyMedicalRecordFormState());
      setPatientHistoryAppointments([]);
      setPatientHistorySearch('');
      setClinicSettings(DEFAULT_CLINIC_SETTINGS);
      setSavedClinicSettings(DEFAULT_CLINIC_SETTINGS);
      setAuditSearch('');
      setAuditEntityFilter('ALL');
      setAuditActionFilter('ALL');
      setAppointmentsByDate((current) => ({
        ...current,
        [selectedDate]: demoDataset.appointments,
      }));
      setProfiles(demoDataset.profiles);
      setAuditEvents(demoDataset.auditEvents);
      setAuditReferenceNow(getAuditReferenceTimestamp(demoDataset.auditEvents));
      const demoPolicy: InactivityPolicySnapshot = {
        enabled: true,
        maxInactiveDays: 90,
        excludedRoles: ['ADMIN'],
        cutoffDate: new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      setInactivityPolicy(demoPolicy);
      setInactivityPolicyForm(buildInactivityPolicyFormState(demoPolicy));
      setLastInactivityScanResult(null);

      setAppointmentForm((current) => ({
        ...current,
        patientId: current.patientId || demoDataset.patients[0]?.id || '',
        veterinarianName: current.veterinarianName || authUser.name,
      }));

      setIsDemoMode(true);
      setStatusMessage(
        'Modo demonstracao ativo: API indisponivel, mas a navegacao segue funcional.',
      );
      setErrorMessage('');
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, [authUser, request, selectedDate]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    void bootstrapWorkspace();
  }, [authUser, bootstrapWorkspace]);

  useEffect(() => {
    if (!patientForm.tutorResolvedId) {
      return;
    }

    const tutorExists = tutors.some((tutor) => tutor.id === patientForm.tutorResolvedId);
    if (!tutorExists) {
      setPatientForm((current) => ({
        ...current,
        tutorResolvedId: '',
      }));
    }
  }, [patientForm.tutorResolvedId, tutors]);

  useEffect(() => {
    setSchedulingDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!authUser || activeSection !== 'scheduling') {
      return;
    }

    void ensureAppointmentsByDate(schedulingDatesWindow);
  }, [
    activeSection,
    authUser,
    ensureAppointmentsByDate,
    schedulingDatesWindow,
  ]);

  useEffect(() => {
    if (activeSection !== 'scheduling') {
      return;
    }

    if (!nextFreeSlot) {
      setAppointmentForm((current) => ({
        ...current,
        startsAt: '',
      }));
      return;
    }

    const selectedSlot = schedulingSlotsAvailability.find(
      (slot) => slot.time === appointmentForm.startsAt,
    );

    if (!selectedSlot || selectedSlot.blocked) {
      setAppointmentForm((current) => ({
        ...current,
        startsAt: nextFreeSlot,
      }));
    }
  }, [activeSection, appointmentForm.startsAt, nextFreeSlot, schedulingSlotsAvailability]);

  useEffect(() => {
    if (activeSection !== 'scheduling' || nextFreeSlot) {
      return;
    }

    const nextDayWithSlot = schedulingDaySummaries.find(
      (day) => day.isLoaded && day.freeCount > 0,
    );

    if (nextDayWithSlot && nextDayWithSlot.dateIso !== schedulingDate) {
      setSchedulingDate(nextDayWithSlot.dateIso);
    }
  }, [activeSection, nextFreeSlot, schedulingDate, schedulingDaySummaries]);

  useEffect(() => {
    if (activeSection !== 'medicalRecords') {
      return;
    }

    if (sortedAppointments.length === 0) {
      setSelectedConsultationId('');
      setSelectedMedicalRecord(null);
      setMedicalRecordForm(createEmptyMedicalRecordFormState());
      return;
    }

    const selectedExists = sortedAppointments.some(
      (item) => item.id === selectedConsultationId,
    );

    if (!selectedExists) {
      setSelectedConsultationId(nextConsultation?.id ?? sortedAppointments[0].id);
    }
  }, [activeSection, nextConsultation?.id, selectedConsultationId, sortedAppointments]);

  useEffect(() => {
    if (activeSection !== 'medicalRecords' || !selectedConsultationId) {
      return;
    }

    void loadMedicalRecordForConsultation(selectedConsultationId);
  }, [activeSection, loadMedicalRecordForConsultation, selectedConsultationId]);

  useEffect(() => {
    if (activeSection !== 'medicalRecords') {
      return;
    }

    if (!selectedConsultation) {
      setPatientHistoryAppointments([]);
      return;
    }

    void loadPatientHistory(selectedConsultation.patientId);
  }, [activeSection, loadPatientHistory, selectedConsultation]);

  useEffect(() => {
    if (activeSection !== 'audit') {
      return;
    }

    void loadAuditEvents();
  }, [activeSection, loadAuditEvents]);

  useEffect(() => {
    if (activeSection !== 'users' || !authUser || !canManageUsers) {
      return;
    }

    if (!inactivityPolicy) {
      void loadInactivityPolicy();
    }
  }, [activeSection, authUser, canManageUsers, inactivityPolicy, loadInactivityPolicy]);

  useEffect(() => {
    if (!isRescheduleDrawerOpen || !rescheduleTargetAppointment) {
      return;
    }

    const selected = rescheduleSlotsAvailability.find(
      (slot) => slot.time === rescheduleStartsAt,
    );

    if (selected && !selected.blocked) {
      return;
    }

    const nextFree = rescheduleSlotsAvailability.find((slot) => !slot.blocked);
    setRescheduleStartsAt(nextFree?.time ?? '');
  }, [
    isRescheduleDrawerOpen,
    rescheduleSlotsAvailability,
    rescheduleStartsAt,
    rescheduleTargetAppointment,
  ]);

  useEffect(() => {
    if (!isRescheduleDrawerOpen || !rescheduleTargetAppointment) {
      return;
    }

    if (!(rescheduleDate in appointmentsByDate)) {
      void ensureAppointmentsByDate([rescheduleDate]);
    }
  }, [
    appointmentsByDate,
    ensureAppointmentsByDate,
    isRescheduleDrawerOpen,
    rescheduleDate,
    rescheduleTargetAppointment,
  ]);

  useEffect(() => {
    if (isRescheduleDrawerOpen && !rescheduleTargetAppointment) {
      setIsRescheduleDrawerOpen(false);
      setRescheduleAppointmentId('');
      setRescheduleStartsAt('');
      setIsRescheduleSaving(false);
    }
  }, [isRescheduleDrawerOpen, rescheduleTargetAppointment]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatusMessage('');
    setErrorMessage('');
    setIsAuthenticating(true);

    try {
      const result = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
        skipAuth: true,
      });

      setAuthToken(result.accessToken);
      setAuthUser(result.user);
      setActiveSection('consultations');
      setStatusMessage(`Bem-vindo, ${result.user.name}.`);
      setIsDemoMode(false);
    } catch (error) {
      const message = normalizeErrorMessage(
        error,
        'Nao foi possivel autenticar agora.',
      );

      const fallbackUser = DEMO_CREDENTIALS.find((item) => {
        return (
          item.email === authForm.email.trim().toLowerCase() &&
          item.password === authForm.password
        );
      });

      const isConnectivityIssue =
        message.includes('timeout') ||
        message.includes('conexao') ||
        message.includes('API indisponivel');

      if (fallbackUser && isConnectivityIssue) {
        setAuthToken('demo-token');
        setAuthUser(fallbackUser.user);
        setActiveSection('consultations');
        setIsDemoMode(true);
        setStatusMessage(
          'Login em modo demonstracao ativo porque a API esta indisponivel.',
        );
        setErrorMessage('');
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsAuthenticating(false);
    }
  }

  function onLogout() {
    setAuthToken('');
    setAuthUser(null);
    setTutors([]);
    setPatients([]);
    setAppointments([]);
    setAppointmentsByDate({});
    setProfiles([]);
    setInactivityPolicy(null);
    setInactivityPolicyForm({
      enabled: true,
      maxInactiveDays: '90',
      excludedRoles: ['ADMIN'],
    });
    setLastInactivityScanResult(null);
    setAuditEvents([]);
    setAuditReferenceNow(0);
    setAuditSearch('');
    setAuditEntityFilter('ALL');
    setAuditActionFilter('ALL');
    setDemoMedicalRecordsByAppointment({});
    setSelectedConsultationId('');
    setSelectedMedicalRecord(null);
    setMedicalRecordForm(createEmptyMedicalRecordFormState());
    setPatientHistoryAppointments([]);
    setPatientHistorySearch('');
    setIsRescheduleDrawerOpen(false);
    setRescheduleAppointmentId('');
    setRescheduleDate(toLocalISODate(new Date()));
    setRescheduleStartsAt('');
    setIsDemoMode(false);
    setClinicSettings(DEFAULT_CLINIC_SETTINGS);
    setSavedClinicSettings(DEFAULT_CLINIC_SETTINGS);
    setErrorMessage('');
    setStatusMessage('Sessao finalizada.');
    setActiveSection('consultations');
    setSchedulingDate(toLocalISODate(new Date()));
    setPatientForm({
      tutorDocument: '',
      tutorResolvedId: '',
      tutorName: '',
      tutorPhone: '',
      tutorEmail: '',
      tutorAddress: '',
      name: '',
      species: '',
      breed: '',
      sex: 'UNKNOWN',
      birthDate: '',
      currentWeight: '',
    });
  }

  function onSelectSchedulingDate(dateIso: string) {
    setSchedulingDate(dateIso);
    setAppointmentForm((current) => ({
      ...current,
      startsAt: '',
    }));

    if (!(dateIso in appointmentsByDate)) {
      void ensureAppointmentsByDate([dateIso]);
    }
  }

  async function onPrepareReturnScheduling() {
    if (!selectedConsultation || !selectedMedicalRecord) {
      return;
    }

    if (selectedMedicalRecord.status !== 'FINALIZED') {
      setStatusMessage('');
      setErrorMessage(
        'Finalize o prontuario antes de usar o agendamento automatico de retorno.',
      );
      return;
    }

    const suggestedDate = medicalRecordForm.recommendedReturnAt;
    if (!suggestedDate) {
      setStatusMessage('');
      setErrorMessage(
        'Defina a data sugerida de retorno para agendar automaticamente.',
      );
      return;
    }

    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        const candidateDates = Array.from(
          new Set([suggestedDate, ...schedulingDatesWindow]),
        );

        await ensureAppointmentsByDate(
          candidateDates.filter((dateIso) => !(dateIso in appointmentsByDate)),
        );

        let selectedSlot: { dateIso: string; time: string } | null = null;
        for (const dateIso of candidateDates) {
          const dayAppointments = appointmentsByDate[dateIso] ?? [];
          const slots = buildSlotsAvailability(
            dateIso,
            dailySlots,
            clinicSettings.consultationDurationMinutes,
            dayAppointments,
            {
              ignoreCanceledAppointments: true,
            },
          );

          const free = slots.find((slot) => !slot.blocked);
          if (free) {
            selectedSlot = {
              dateIso,
              time: free.time,
            };
            break;
          }
        }

        if (!selectedSlot) {
          throw new Error('Nao ha horario livre para retorno na janela atual.');
        }

        const startsAt = joinDateAndTime(selectedSlot.dateIso, selectedSlot.time);
        const endsAt = addMinutesToDate(
          selectedSlot.dateIso,
          selectedSlot.time,
          clinicSettings.consultationDurationMinutes,
        );

        const createdAppointment: Appointment = {
          id: `demo-appt-return-${Date.now()}`,
          patientId: selectedConsultation.patientId,
          tutorId: selectedConsultation.tutorId,
          veterinarianName: selectedConsultation.veterinarianName,
          startsAt,
          endsAt,
          reason: `Retorno - ${selectedConsultation.reason}`,
          status: 'SCHEDULED',
          notes: `Retorno automatico da consulta ${selectedConsultation.id}`,
          patient: selectedConsultation.patient,
          tutor: selectedConsultation.tutor,
        };

        setAppointmentsByDate((current) => ({
          ...current,
          [selectedSlot.dateIso]: sortAppointments([
            ...(current[selectedSlot.dateIso] ?? []),
            createdAppointment,
          ]),
        }));

        if (selectedSlot.dateIso === selectedDate) {
          setAppointments((current) =>
            sortAppointments([...current, createdAppointment]),
          );
        }

        setPatientHistoryAppointments((current) =>
          sortAppointments([...current, createdAppointment]),
        );

        const now = new Date().toISOString();
        setAuditEvents((current) => [
          {
            id: `demo-audit-return-${Date.now()}`,
            actorId: authUser?.id ?? null,
            entity: 'APPOINTMENT',
            entityId: createdAppointment.id,
            action: 'RETURN_APPOINTMENT_SCHEDULED',
            summary: `Retorno criado automaticamente da consulta ${selectedConsultation.id} para ${createdAppointment.startsAt}`,
            createdAt: now,
          },
          ...current,
        ]);
        setAuditReferenceNow(new Date(now).getTime());

        setSelectedDate(selectedSlot.dateIso);
        setActiveSection('consultations');
        setStatusMessage(
          `Retorno agendado automaticamente para ${formatDateTime(
            createdAppointment.startsAt,
          )} (modo demonstracao).`,
        );
        return;
      }

      const createdAppointment = await request<Appointment>(
        `/appointments/${selectedConsultation.id}/return`,
        {
          method: 'POST',
        },
      );

      const createdDate = toLocalISODate(new Date(createdAppointment.startsAt));

      setAppointmentsByDate((current) => ({
        ...current,
        [createdDate]: sortAppointments([
          ...(current[createdDate] ?? []).filter(
            (appointment) => appointment.id !== createdAppointment.id,
          ),
          createdAppointment,
        ]),
      }));

      if (createdDate === selectedDate) {
        setAppointments((current) =>
          sortAppointments([
            ...current.filter((appointment) => appointment.id !== createdAppointment.id),
            createdAppointment,
          ]),
        );
      }

      setPatientHistoryAppointments((current) =>
        sortAppointments([
          ...current.filter((appointment) => appointment.id !== createdAppointment.id),
          createdAppointment,
        ]),
      );

      setSelectedDate(createdDate);
      setActiveSection('consultations');
      setStatusMessage(
        `Retorno agendado automaticamente para ${formatDateTime(
          createdAppointment.startsAt,
        )}.`,
      );
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao agendar retorno automaticamente.'),
      );
    }
  }

  function onOpenRescheduleDrawer(appointment: Appointment) {
    const currentDate = toLocalISODate(new Date(appointment.startsAt));

    setRescheduleAppointmentId(appointment.id);
    setRescheduleDate(currentDate);
    setRescheduleStartsAt(timeInputFromDateTime(appointment.startsAt));
    setIsRescheduleDrawerOpen(true);

    void ensureAppointmentsByDate(schedulingDatesWindow);
  }

  function onCloseRescheduleDrawer() {
    setIsRescheduleDrawerOpen(false);
    setRescheduleAppointmentId('');
    setRescheduleDate(toLocalISODate(new Date()));
    setRescheduleStartsAt('');
    setIsRescheduleSaving(false);
  }

  async function onCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsAppointmentSaving(true);

    try {
      const patient = patients.find((item) => item.id === appointmentForm.patientId);
      const tutor = tutors.find((item) => item.id === patient?.tutorId);

      if (!patient || !tutor) {
        throw new Error('Selecione um paciente valido para continuar.');
      }

      if (!appointmentForm.startsAt) {
        throw new Error('Nao ha horario disponivel para o dia selecionado.');
      }

      const selectedSlot = schedulingSlotsAvailability.find(
        (slot) => slot.time === appointmentForm.startsAt,
      );
      if (!selectedSlot || selectedSlot.blocked) {
        throw new Error(
          'Este horario ja foi ocupado. Selecione o proximo horario disponivel.',
        );
      }

      const startsAt = joinDateAndTime(schedulingDate, appointmentForm.startsAt);
      const endsAt = addMinutesToDate(
        schedulingDate,
        appointmentForm.startsAt,
        clinicSettings.consultationDurationMinutes,
      );

      let createdAppointment: Appointment;

      if (isDemoMode) {
        createdAppointment = {
          id: `demo-appt-${Date.now()}`,
          patientId: patient.id,
          tutorId: tutor.id,
          veterinarianName: appointmentForm.veterinarianName.trim(),
          startsAt,
          endsAt,
          reason: appointmentForm.reason.trim(),
          status: 'SCHEDULED',
          notes: null,
          patient: {
            id: patient.id,
            name: patient.name,
            species: patient.species,
            breed: patient.breed,
          },
          tutor: {
            id: tutor.id,
            name: tutor.name,
            phone: tutor.phone,
          },
        };
      } else {
        createdAppointment = await request<Appointment>('/appointments', {
          method: 'POST',
          body: JSON.stringify({
            patientId: appointmentForm.patientId,
            veterinarianName: appointmentForm.veterinarianName.trim(),
            startsAt,
            endsAt,
            reason: appointmentForm.reason.trim(),
          }),
        });
      }

      setAppointmentsByDate((current) => {
        const nextDateAppointments = sortAppointments([
          ...(current[schedulingDate] ?? []),
          createdAppointment,
        ]);

        return {
          ...current,
          [schedulingDate]: nextDateAppointments,
        };
      });

      if (schedulingDate === selectedDate) {
        setAppointments((current) => sortAppointments([...current, createdAppointment]));
      }

      setAppointmentForm((current) => ({
        ...current,
        reason: '',
        startsAt: '',
      }));

      setStatusMessage('Consulta agendada com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao criar agendamento.'),
      );
    } finally {
      setIsAppointmentSaving(false);
    }
  }

  async function onRescheduleAppointment() {
    if (!rescheduleTargetAppointment) {
      return;
    }

    if (!rescheduleStartsAt) {
      setStatusMessage('');
      setErrorMessage('Selecione um horario livre para concluir a remarcacao.');
      return;
    }

    const selectedSlot = rescheduleSlotsAvailability.find(
      (slot) => slot.time === rescheduleStartsAt,
    );
    if (!selectedSlot || selectedSlot.blocked) {
      setStatusMessage('');
      setErrorMessage('Horario indisponivel. Escolha outro intervalo livre.');
      return;
    }

    const startsAt = joinDateAndTime(rescheduleDate, rescheduleStartsAt);
    const endsAt = addMinutesToDate(
      rescheduleDate,
      rescheduleStartsAt,
      clinicSettings.consultationDurationMinutes,
    );

    setStatusMessage('');
    setErrorMessage('');
    setIsRescheduleSaving(true);

    try {
      let updatedAppointment: Appointment;

      if (isDemoMode) {
        updatedAppointment = {
          ...rescheduleTargetAppointment,
          startsAt,
          endsAt,
          status:
            rescheduleTargetAppointment.status === 'IN_PROGRESS'
              ? 'SCHEDULED'
              : rescheduleTargetAppointment.status,
        };
      } else {
        updatedAppointment = await request<Appointment>(
          `/appointments/${rescheduleTargetAppointment.id}/reschedule`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              startsAt,
              endsAt,
              veterinarianName: rescheduleTargetAppointment.veterinarianName,
            }),
          },
        );
      }

      const previousDate = toLocalISODate(new Date(rescheduleTargetAppointment.startsAt));
      const updatedDate = toLocalISODate(new Date(updatedAppointment.startsAt));

      setAppointmentsByDate((current) => {
        const next = { ...current };
        const previousDateItems = (next[previousDate] ?? []).filter(
          (item) => item.id !== updatedAppointment.id,
        );

        if (previousDate === updatedDate) {
          next[updatedDate] = sortAppointments([...previousDateItems, updatedAppointment]);
          return next;
        }

        next[previousDate] = sortAppointments(previousDateItems);
        next[updatedDate] = sortAppointments([
          ...(next[updatedDate] ?? []),
          updatedAppointment,
        ]);
        return next;
      });

      setAppointments((current) => {
        if (selectedDate === previousDate && selectedDate === updatedDate) {
          return sortAppointments(
            current.map((item) =>
              item.id === updatedAppointment.id ? updatedAppointment : item,
            ),
          );
        }

        if (selectedDate === previousDate && selectedDate !== updatedDate) {
          return sortAppointments(
            current.filter((item) => item.id !== updatedAppointment.id),
          );
        }

        if (selectedDate !== previousDate && selectedDate === updatedDate) {
          return sortAppointments([
            ...current.filter((item) => item.id !== updatedAppointment.id),
            updatedAppointment,
          ]);
        }

        return current;
      });

      setPatientHistoryAppointments((current) =>
        sortAppointments(
          current.map((item) =>
            item.id === updatedAppointment.id ? updatedAppointment : item,
          ),
        ),
      );

      onCloseRescheduleDrawer();
      setStatusMessage(
        `Consulta remarcada para ${formatDateTime(updatedAppointment.startsAt)}.`,
      );
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao remarcar consulta.'),
      );
    } finally {
      setIsRescheduleSaving(false);
    }
  }

  async function onChangeAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
  ) {
    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        patchAppointmentStatusLocally(appointmentId, status);
      } else {
        const updated = await request<Appointment>(
          `/appointments/${appointmentId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              status,
            }),
          },
        );

        setAppointments((current) =>
          sortAppointments(
            current.map((item) => {
              if (item.id !== appointmentId) {
                return item;
              }

              return updated;
            }),
          ),
        );

        const updatedDate = toLocalISODate(new Date(updated.startsAt));
        setAppointmentsByDate((current) => {
          const dayAppointments = current[updatedDate] ?? [];
          return {
            ...current,
            [updatedDate]: sortAppointments(
              dayAppointments.map((item) => {
                if (item.id !== appointmentId) {
                  return item;
                }

                return updated;
              }),
            ),
          };
        });

        setPatientHistoryAppointments((current) =>
          sortAppointments(
            current.map((item) => {
              if (item.id !== appointmentId) {
                return item;
              }

              return {
                ...item,
                status: updated.status,
              };
            }),
          ),
        );
      }

      setStatusMessage('Status atualizado com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao atualizar status da consulta.'),
      );
    }
  }

  function onCancelAppointment(appointmentId: string) {
    const shouldCancel = window.confirm(
      'Deseja realmente cancelar esta consulta?',
    );

    if (!shouldCancel) {
      return;
    }

    void onChangeAppointmentStatus(appointmentId, 'CANCELED');
  }

  function onSelectConsultationForMedicalRecord(appointmentId: string) {
    setSelectedConsultationId(appointmentId);
    setActiveSection('medicalRecords');
  }

  function onStartAttendance(appointment: Appointment) {
    setSelectedConsultationId(appointment.id);
    setActiveSection('medicalRecords');

    if (
      appointment.status !== 'IN_PROGRESS' &&
      appointment.status !== 'COMPLETED' &&
      appointment.status !== 'CANCELED'
    ) {
      void onChangeAppointmentStatus(appointment.id, 'IN_PROGRESS');
    }
  }

  function onMedicalRecordFieldChange(
    field: keyof MedicalRecordFormState,
    value: string,
  ) {
    setMedicalRecordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function onStartMedicalRecord() {
    if (!selectedConsultation) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsMedicalRecordLoading(true);

    try {
      if (isDemoMode) {
        const now = new Date().toISOString();
        const createdRecord: MedicalRecord = {
          id: selectedMedicalRecord?.id ?? `demo-record-${Date.now()}`,
          appointmentId: selectedConsultation.id,
          status: 'DRAFT',
          chiefComplaint: null,
          symptomsOnset: null,
          clinicalHistory: null,
          physicalExam: null,
          presumptiveDiagnosis: null,
          conduct: null,
          guidance: null,
          recommendedReturnAt: null,
          finalizedAt: null,
          createdAt: selectedMedicalRecord?.createdAt ?? now,
          updatedAt: now,
        };

        setDemoMedicalRecordsByAppointment((current) => ({
          ...current,
          [selectedConsultation.id]: createdRecord,
        }));
        setSelectedMedicalRecord(createdRecord);
        setMedicalRecordForm(buildMedicalRecordFormFromRecord(createdRecord));
        setStatusMessage('Prontuario iniciado no modo demonstracao.');
        return;
      }

      const record = await request<MedicalRecord>(
        `/appointments/${selectedConsultation.id}/medical-record/start`,
        {
          method: 'POST',
        },
      );

      setSelectedMedicalRecord(record);
      setMedicalRecordForm(buildMedicalRecordFormFromRecord(record));
      setStatusMessage('Prontuario iniciado com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao iniciar prontuario da consulta.'),
      );
    } finally {
      setIsMedicalRecordLoading(false);
    }
  }

  async function onSaveMedicalRecordDraft() {
    if (!selectedConsultation) {
      return;
    }

    if (selectedConsultationIsFinalizedRecord) {
      setErrorMessage(
        'Este prontuario ja foi finalizado e nao aceita novas alteracoes em rascunho.',
      );
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsMedicalRecordSaving(true);

    try {
      const payload = buildMedicalRecordPayload(medicalRecordForm);

      if (isDemoMode) {
        const now = new Date().toISOString();
        const draftRecord: MedicalRecord = {
          id: selectedMedicalRecord?.id ?? `demo-record-${Date.now()}`,
          appointmentId: selectedConsultation.id,
          status: 'DRAFT',
          chiefComplaint: payload.chiefComplaint ?? null,
          symptomsOnset: payload.symptomsOnset ?? null,
          clinicalHistory: payload.clinicalHistory ?? null,
          physicalExam: payload.physicalExam ?? null,
          presumptiveDiagnosis: payload.presumptiveDiagnosis ?? null,
          conduct: payload.conduct ?? null,
          guidance: payload.guidance ?? null,
          recommendedReturnAt: payload.recommendedReturnAt ?? null,
          finalizedAt: null,
          createdAt: selectedMedicalRecord?.createdAt ?? now,
          updatedAt: now,
        };

        setDemoMedicalRecordsByAppointment((current) => ({
          ...current,
          [selectedConsultation.id]: draftRecord,
        }));
        setSelectedMedicalRecord(draftRecord);
        setMedicalRecordForm(buildMedicalRecordFormFromRecord(draftRecord));
        setStatusMessage('Rascunho do prontuario salvo no modo demonstracao.');
        return;
      }

      const record = await request<MedicalRecord>(
        `/appointments/${selectedConsultation.id}/medical-record/draft`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      );

      setSelectedMedicalRecord(record);
      setMedicalRecordForm(buildMedicalRecordFormFromRecord(record));
      setStatusMessage('Rascunho do prontuario salvo com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao salvar rascunho do prontuario.'),
      );
    } finally {
      setIsMedicalRecordSaving(false);
    }
  }

  async function onFinalizeMedicalRecord() {
    if (!selectedConsultation) {
      return;
    }

    if (selectedConsultationIsFinalizedRecord) {
      setStatusMessage('Prontuario ja finalizado.');
      return;
    }

    if (!medicalRecordCanFinalize) {
      setErrorMessage(
        'Preencha todos os campos obrigatorios para finalizar o prontuario.',
      );
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsMedicalRecordFinalizing(true);

    try {
      const payload = buildMedicalRecordPayload(medicalRecordForm);

      if (isDemoMode) {
        const now = new Date().toISOString();
        const finalizedRecord: MedicalRecord = {
          id: selectedMedicalRecord?.id ?? `demo-record-${Date.now()}`,
          appointmentId: selectedConsultation.id,
          status: 'FINALIZED',
          chiefComplaint: payload.chiefComplaint ?? null,
          symptomsOnset: payload.symptomsOnset ?? null,
          clinicalHistory: payload.clinicalHistory ?? null,
          physicalExam: payload.physicalExam ?? null,
          presumptiveDiagnosis: payload.presumptiveDiagnosis ?? null,
          conduct: payload.conduct ?? null,
          guidance: payload.guidance ?? null,
          recommendedReturnAt: payload.recommendedReturnAt ?? null,
          finalizedAt: now,
          createdAt: selectedMedicalRecord?.createdAt ?? now,
          updatedAt: now,
        };

        setDemoMedicalRecordsByAppointment((current) => ({
          ...current,
          [selectedConsultation.id]: finalizedRecord,
        }));
        setSelectedMedicalRecord(finalizedRecord);
        setMedicalRecordForm(buildMedicalRecordFormFromRecord(finalizedRecord));
        patchAppointmentStatusLocally(selectedConsultation.id, 'COMPLETED');
        setAuditEvents((current) => [
          {
            id: `demo-audit-${Date.now()}`,
            actorId: authUser?.id ?? null,
            entity: 'MEDICAL_RECORD',
            entityId: finalizedRecord.id,
            action: 'MEDICAL_RECORD_FINALIZED',
            summary: `Prontuario finalizado para consulta ${selectedConsultation.id}`,
            createdAt: now,
          },
          ...current,
        ]);
        setAuditReferenceNow(new Date(now).getTime());
        setStatusMessage(
          'Prontuario finalizado e consulta marcada como concluida (modo demonstracao).',
        );
        return;
      }

      const finalizedRecord = await request<MedicalRecord>(
        `/appointments/${selectedConsultation.id}/medical-record/finalize`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      );

      setSelectedMedicalRecord(finalizedRecord);
      setMedicalRecordForm(buildMedicalRecordFormFromRecord(finalizedRecord));
      patchAppointmentStatusLocally(selectedConsultation.id, 'COMPLETED');
      await loadAuditEvents();
      setStatusMessage('Prontuario finalizado e consulta concluida.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao finalizar prontuario da consulta.'),
      );
    } finally {
      setIsMedicalRecordFinalizing(false);
    }
  }

  function onDiscardClinicSettingsChanges() {
    setClinicSettings(savedClinicSettings);
    setAppointmentForm((current) => ({
      ...current,
      startsAt: '',
    }));
    setStatusMessage('Alteracoes locais de agenda foram descartadas.');
    setErrorMessage('');
  }

  async function onSaveClinicSettings() {
    setStatusMessage('');
    setErrorMessage('');

    if (!hasPendingClinicSettingsChanges) {
      setStatusMessage('Nenhuma alteracao pendente para salvar.');
      return;
    }

    if (clinicScheduleValidationError) {
      setErrorMessage(clinicScheduleValidationError);
      return;
    }

    setIsClinicSettingsSaving(true);

    try {
      if (isDemoMode) {
        setSavedClinicSettings(clinicSettings);
        setStatusMessage(
          'Configuracoes salvas no modo demonstracao (somente sessao atual).',
        );
        return;
      }

      const updatedSettings = await request<ClinicScheduleSettings>(
        '/clinic-settings/schedule',
        {
          method: 'PATCH',
          body: JSON.stringify({
            consultationDurationMinutes:
              clinicSettings.consultationDurationMinutes,
            openingTime: clinicSettings.openingTime,
            closingTime: clinicSettings.closingTime,
          }),
        },
      );

      setClinicSettings(updatedSettings);
      setSavedClinicSettings(updatedSettings);
      setStatusMessage('Configuracoes da clinica salvas com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(
          error,
          'Falha ao salvar configuracoes de agenda da clinica.',
        ),
      );
    } finally {
      setIsClinicSettingsSaving(false);
    }
  }

  function onLookupTutorByDocument() {
    setStatusMessage('');
    setErrorMessage('');

    const normalizedDocument = normalizeDocument(patientForm.tutorDocument);
    if (!normalizedDocument) {
      setErrorMessage('Informe o documento do tutor para buscar.');
      return;
    }

    const foundTutor = sortedTutors.find((tutor) => {
      if (!tutor.document) {
        return false;
      }

      return normalizeDocument(tutor.document) === normalizedDocument;
    });

    if (!foundTutor) {
      setPatientForm((current) => ({
        ...current,
        tutorResolvedId: '',
      }));
      setStatusMessage(
        'Tutor nao encontrado. Complete os dados para criar um novo tutor junto com o paciente.',
      );
      return;
    }

    setPatientForm((current) => ({
      ...current,
      tutorResolvedId: foundTutor.id,
      tutorName: foundTutor.name,
      tutorPhone: foundTutor.phone ?? '',
      tutorEmail: foundTutor.email ?? '',
      tutorAddress: foundTutor.address ?? '',
    }));
    setStatusMessage(`Tutor localizado: ${foundTutor.name}.`);
  }

  async function onCreatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsPatientSaving(true);

    try {
      const normalizedDocument = normalizeDocument(patientForm.tutorDocument);
      const name = patientForm.name.trim();
      const species = patientForm.species.trim();

      if (!normalizedDocument) {
        throw new Error('Informe o documento do tutor.');
      }

      if (!name) {
        throw new Error('Informe o nome do paciente.');
      }

      if (!species) {
        throw new Error('Informe a especie do paciente.');
      }

      const normalizedWeight = normalizeOptionalWeight(patientForm.currentWeight);
      if (patientForm.currentWeight.trim() && normalizedWeight === undefined) {
        throw new Error('Peso atual invalido. Use apenas numeros.');
      }

      const resolvedTutor =
        selectedTutorByDocument ??
        sortedTutors.find((tutor) => {
          if (!tutor.document) {
            return false;
          }

          return normalizeDocument(tutor.document) === normalizedDocument;
        }) ??
        null;

      let tutorToUse: Tutor;
      let createdNewTutor = false;

      if (resolvedTutor) {
        tutorToUse = resolvedTutor;
      } else {
        const tutorName = patientForm.tutorName.trim();
        if (!tutorName) {
          throw new Error(
            'Tutor nao localizado. Preencha o nome do tutor para concluir o cadastro combinado.',
          );
        }

        const tutorPayload = {
          name: tutorName,
          document: patientForm.tutorDocument.trim(),
          phone: normalizeOptionalText(patientForm.tutorPhone),
          email: normalizeOptionalText(patientForm.tutorEmail),
          address: normalizeOptionalText(patientForm.tutorAddress),
        };

        if (isDemoMode) {
          tutorToUse = {
            id: `demo-tutor-${Date.now()}`,
            name: tutorPayload.name,
            document: tutorPayload.document,
            phone: tutorPayload.phone ?? null,
            email: tutorPayload.email ?? null,
            address: tutorPayload.address ?? null,
          };
        } else {
          tutorToUse = await request<Tutor>('/tutors', {
            method: 'POST',
            body: JSON.stringify(tutorPayload),
          });
        }

        createdNewTutor = true;
        setTutors((current) => sortTutors([tutorToUse, ...current]));
      }

      const patientPayload = {
        tutorId: tutorToUse.id,
        name,
        species,
        breed: normalizeOptionalText(patientForm.breed),
        sex: patientForm.sex,
        birthDate: normalizeOptionalText(patientForm.birthDate),
        currentWeight: normalizedWeight,
      };

      let createdPatient: Patient;

      if (isDemoMode) {
        createdPatient = {
          id: `demo-patient-${Date.now()}`,
          tutorId: patientPayload.tutorId,
          name: patientPayload.name,
          species: patientPayload.species,
          breed: patientPayload.breed ?? null,
          sex: patientPayload.sex,
          birthDate: patientPayload.birthDate ?? null,
          currentWeight: patientPayload.currentWeight ?? null,
        };
      } else {
        createdPatient = await request<Patient>('/patients', {
          method: 'POST',
          body: JSON.stringify(patientPayload),
        });
      }

      setPatients((current) => sortPatients([createdPatient, ...current]));
      setAppointmentForm((current) => ({
        ...current,
        patientId: current.patientId || createdPatient.id,
      }));
      setPatientForm((current) => ({
        ...current,
        tutorResolvedId: tutorToUse.id,
        tutorDocument: tutorToUse.document ?? current.tutorDocument,
        tutorName: tutorToUse.name,
        tutorPhone: tutorToUse.phone ?? '',
        tutorEmail: tutorToUse.email ?? '',
        tutorAddress: tutorToUse.address ?? '',
        name: '',
        species: '',
        breed: '',
        sex: 'UNKNOWN',
        birthDate: '',
        currentWeight: '',
      }));
      setStatusMessage(
        createdNewTutor
          ? 'Tutor e paciente cadastrados com sucesso.'
          : 'Paciente cadastrado com tutor existente.',
      );
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error, 'Falha ao cadastrar paciente.'));
    } finally {
      setIsPatientSaving(false);
    }
  }

  async function onCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser || !canManageUsers) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsProfileSaving(true);

    try {
      if (isDemoMode) {
        const now = new Date().toISOString();

        const created: AccessProfile = {
          id: `demo-user-${Date.now()}`,
          name: profileForm.name.trim(),
          email: profileForm.email.trim().toLowerCase(),
          role: profileForm.role,
          active: true,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
        };

        setProfiles((current) => sortProfiles([created, ...current]));
        setAuditEvents((current) => [
          {
            id: `demo-audit-${Date.now()}`,
            actorId: authUser.id,
            entity: 'USER',
            entityId: created.id,
            action: 'PROFILE_CREATED',
            summary: `Perfil criado com papel ${created.role}`,
            createdAt: now,
          },
          ...current,
        ]);
        setAuditReferenceNow(new Date(now).getTime());
      } else {
        const created = await request<AccessProfile>('/profiles', {
          method: 'POST',
          body: JSON.stringify({
            name: profileForm.name.trim(),
            email: profileForm.email.trim().toLowerCase(),
            role: profileForm.role,
            password: profileForm.password,
          }),
        });

        setProfiles((current) => sortProfiles([created, ...current]));
        await loadAuditEvents();
      }

      setProfileForm({
        name: '',
        email: '',
        role: 'VETERINARIAN',
        password: 'easyvet123',
      });

      setStatusMessage('Perfil criado com sucesso.');
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error, 'Falha ao criar perfil.'));
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function onUpdateProfileRole(profileId: string, role: ActorRole) {
    if (!authUser || !canManageUsers) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        const eventTime = new Date().toISOString();
        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id !== profileId) {
              return profile;
            }

            return {
              ...profile,
              role,
              updatedAt: eventTime,
            };
          }),
        );
        setAuditEvents((current) => [
          {
            id: `demo-audit-${Date.now()}`,
            actorId: authUser.id,
            entity: 'USER',
            entityId: profileId,
            action: 'ROLE_CHANGED',
            summary: `Papel alterado para ${role}`,
            createdAt: eventTime,
          },
          ...current,
        ]);
        setAuditReferenceNow(new Date(eventTime).getTime());
      } else {
        const updated = await request<AccessProfile>(`/profiles/${profileId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({
            role,
          }),
        });

        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id !== profileId) {
              return profile;
            }

            return updated;
          }),
        );
        await loadAuditEvents();
      }

      setStatusMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao atualizar papel do perfil.'),
      );
    }
  }

  async function onUpdateProfileActive(profileId: string, active: boolean) {
    if (!authUser || !canManageUsers) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setProfileStatusSavingId(profileId);

    try {
      if (isDemoMode) {
        const now = new Date().toISOString();
        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id !== profileId) {
              return profile;
            }

            return {
              ...profile,
              active,
              updatedAt: now,
            };
          }),
        );
        setAuditEvents((current) => [
          {
            id: `demo-audit-${Date.now()}`,
            actorId: authUser.id,
            entity: 'USER',
            entityId: profileId,
            action: active ? 'PROFILE_ACTIVATED' : 'PROFILE_DEACTIVATED',
            summary: active ? 'Perfil reativado' : 'Perfil inativado',
            createdAt: now,
          },
          ...current,
        ]);
        setAuditReferenceNow(new Date(now).getTime());
      } else {
        const updated = await request<AccessProfile>(
          `/profiles/${profileId}/active`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              active,
            }),
          },
        );

        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id !== profileId) {
              return profile;
            }

            return updated;
          }),
        );
        await loadAuditEvents();
      }

      setStatusMessage(
        active
          ? 'Usuario reativado com sucesso.'
          : 'Usuario inativado com sucesso.',
      );
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao atualizar status do usuario.'),
      );
    } finally {
      setProfileStatusSavingId('');
    }
  }

  function onToggleInactivityExcludedRole(role: ActorRole) {
    setInactivityPolicyForm((current) => {
      const hasRole = current.excludedRoles.includes(role);

      return {
        ...current,
        excludedRoles: hasRole
          ? current.excludedRoles.filter((item) => item !== role)
          : [...current.excludedRoles, role],
      };
    });
  }

  function onDiscardInactivityPolicyChanges() {
    if (!inactivityPolicy) {
      return;
    }

    setInactivityPolicyForm(buildInactivityPolicyFormState(inactivityPolicy));
    setStatusMessage('Alteracoes da politica descartadas.');
    setErrorMessage('');
  }

  async function onSaveInactivityPolicy() {
    if (!authUser || !canManageUsers || !inactivityPolicy) {
      return;
    }

    const parsedMaxDays = Number(inactivityPolicyForm.maxInactiveDays);
    if (!Number.isInteger(parsedMaxDays) || parsedMaxDays < 1 || parsedMaxDays > 3650) {
      setStatusMessage('');
      setErrorMessage('Defina um limite inteiro de 1 a 3650 dias para inatividade.');
      return;
    }

    const excludedRoles = Array.from(new Set(inactivityPolicyForm.excludedRoles));

    setStatusMessage('');
    setErrorMessage('');
    setIsInactivityPolicySaving(true);

    try {
      if (isDemoMode) {
        const updatedPolicy: InactivityPolicySnapshot = {
          enabled: inactivityPolicyForm.enabled,
          maxInactiveDays: parsedMaxDays,
          excludedRoles,
          cutoffDate: new Date(
            Date.now() - parsedMaxDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };

        setInactivityPolicy(updatedPolicy);
        setInactivityPolicyForm(buildInactivityPolicyFormState(updatedPolicy));
        setLastInactivityScanResult(null);

        const now = new Date().toISOString();
        setAuditEvents((current) => [
          {
            id: `demo-audit-policy-${Date.now()}`,
            actorId: authUser.id,
            entity: 'SYSTEM_POLICY',
            entityId: 'default',
            action: 'INACTIVITY_POLICY_UPDATED',
            summary: `Politica ajustada para ${parsedMaxDays} dia(s); ativa=${inactivityPolicyForm.enabled ? 'sim' : 'nao'}`,
            createdAt: now,
          },
          ...current,
        ]);
        setAuditReferenceNow(new Date(now).getTime());
      } else {
        const updatedPolicy = await request<InactivityPolicySnapshot>(
          '/profiles/inactivity-policy',
          {
            method: 'PATCH',
            body: JSON.stringify({
              enabled: inactivityPolicyForm.enabled,
              maxInactiveDays: parsedMaxDays,
              excludedRoles,
            }),
          },
        );

        setInactivityPolicy(updatedPolicy);
        setInactivityPolicyForm(buildInactivityPolicyFormState(updatedPolicy));
        setLastInactivityScanResult(null);
        await loadAuditEvents();
      }

      setStatusMessage('Politica de inatividade atualizada com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(
          error,
          'Falha ao salvar politica de inatividade de usuarios.',
        ),
      );
    } finally {
      setIsInactivityPolicySaving(false);
    }
  }

  async function onRunInactivityScan(dryRun: boolean) {
    if (!authUser || !canManageUsers) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsInactivityScanRunning(true);

    try {
      if (isDemoMode) {
        const policy =
          inactivityPolicy ??
          ({
            enabled: true,
            maxInactiveDays: 90,
            excludedRoles: ['ADMIN'],
            cutoffDate: new Date(
              Date.now() - 90 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies InactivityPolicySnapshot);

        const cutoff = new Date(policy.cutoffDate).getTime();
        const candidates = profiles
          .filter((profile) => profile.active)
          .filter((profile) => !policy.excludedRoles.includes(profile.role))
          .filter((profile) => profile.id !== authUser.id)
          .filter((profile) => {
            const reference = profile.lastLoginAt ?? profile.createdAt;
            return new Date(reference).getTime() <= cutoff;
          })
          .map((profile) => ({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            active: profile.active,
            lastLoginAt: profile.lastLoginAt,
            inactiveSince: profile.lastLoginAt ?? profile.createdAt,
          }));

        if (!dryRun && policy.enabled && candidates.length > 0) {
          const now = new Date().toISOString();
          const candidateIds = new Set(candidates.map((candidate) => candidate.id));

          setProfiles((current) =>
            current.map((profile) => {
              if (!candidateIds.has(profile.id)) {
                return profile;
              }

              return {
                ...profile,
                active: false,
                updatedAt: now,
              };
            }),
          );

          setAuditEvents((current) => [
            ...candidates.map((candidate) => ({
              id: `demo-audit-${Date.now()}-${candidate.id}`,
              actorId: authUser.id,
              entity: 'USER',
              entityId: candidate.id,
              action: 'PROFILE_DEACTIVATED_INACTIVITY',
              summary: `Perfil inativado por inatividade superior a ${policy.maxInactiveDays} dia(s)`,
              createdAt: now,
            })),
            ...current,
          ]);
          setAuditReferenceNow(new Date(now).getTime());
        }

        const result: InactivityScanResult = {
          dryRun,
          policy,
          evaluatedUsers: profiles.filter((profile) => profile.active).length,
          matchedUsers: candidates.length,
          updatedUsers: !dryRun && policy.enabled ? candidates.length : 0,
          affectedUsers: candidates,
        };

        setLastInactivityScanResult(result);
        setStatusMessage(
          dryRun
            ? `Simulacao concluida: ${result.matchedUsers} usuario(s) elegivel(is).`
            : `Execucao concluida: ${result.updatedUsers} usuario(s) inativado(s).`,
        );
        return;
      }

      const result = await request<InactivityScanResult>(
        '/profiles/inactivity-scan',
        {
          method: 'POST',
          body: JSON.stringify({
            dryRun,
          }),
        },
      );

      setLastInactivityScanResult(result);

      if (!dryRun && result.updatedUsers > 0) {
        const [profileData, auditData] = await Promise.all([
          request<AccessProfile[]>('/profiles'),
          request<AuditEvent[]>('/audit-events?limit=120'),
        ]);
        setProfiles(profileData);
        setAuditEvents(auditData);
        setAuditReferenceNow(getAuditReferenceTimestamp(auditData));
      }

      setStatusMessage(
        dryRun
          ? `Simulacao concluida: ${result.matchedUsers} usuario(s) elegivel(is).`
          : `Execucao concluida: ${result.updatedUsers} usuario(s) inativado(s).`,
      );
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(
          error,
          'Falha ao executar varredura de inatividade de usuarios.',
        ),
      );
    } finally {
      setIsInactivityScanRunning(false);
    }
  }

  function onExportAuditCsv() {
    if (filteredAuditEvents.length === 0) {
      setErrorMessage('Nao ha eventos para exportar com os filtros atuais.');
      setStatusMessage('');
      return;
    }

    const header = [
      'created_at',
      'entity',
      'action',
      'entity_id',
      'actor_id',
      'summary',
    ];

    const rows = filteredAuditEvents.map((event) => [
      event.createdAt,
      event.entity,
      event.action,
      event.entityId,
      event.actorId ?? 'SYSTEM',
      event.summary ?? '',
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map((row) => row.map((value) => escapeCsvCell(value)).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `easyvet-auditoria-${toLocalISODate(new Date())}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);

    setErrorMessage('');
    setStatusMessage('CSV da auditoria exportado com sucesso.');
  }

  if (!authUser) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <section className="rise-in w-full max-w-md border border-slate-200 bg-white/85 px-8 py-10 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.6)] backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">EasyVet</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Acesso ao sistema</h1>
          <p className="mt-2 text-sm text-slate-600">
            Entre com e-mail e senha para abrir o painel clinico.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={onLogin}>
            <label className="grid gap-1.5 text-sm text-slate-700">
              E-mail
              <input
                required
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="vet@easyvet.local"
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
              />
            </label>

            <label className="grid gap-1.5 text-sm text-slate-700">
              Senha
              <input
                required
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Sua senha"
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
              />
            </label>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="mt-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isAuthenticating ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {errorMessage && (
            <p className="mt-4 text-sm text-rose-700" role="alert">
              {errorMessage}
            </p>
          )}

          {statusMessage && !errorMessage && (
            <p className="mt-4 text-sm text-emerald-700">{statusMessage}</p>
          )}

          <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p>Credenciais de bootstrap: admin@easyvet.local / easyvet123</p>
            <p className="mt-1">
              Seguranca ativa: bloqueio temporario apos tentativas invalidas consecutivas.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="bg-[#10221d] text-slate-100">
        <div className="flex min-h-screen flex-col px-6 py-7">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-teal-200">EasyVet</p>
            <h2 className="mt-2 text-2xl font-semibold">Painel Operacional</h2>
            <p className="mt-2 text-sm text-teal-100/80">
              Navegue por funcionalidades em paginas completas.
            </p>
          </div>

          <nav className="mt-8 grid gap-2">
            {SECTION_ITEMS.map((item, index) => {
              const active = item.id === activeSection;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`text-left transition ${
                    active
                      ? 'bg-white/95 text-slate-900'
                      : 'bg-transparent text-teal-100/90 hover:bg-white/10'
                  }`}
                >
                  <span className="block border-l border-current/30 px-4 py-3">
                    <span className="block text-[11px] uppercase tracking-[0.24em] opacity-70">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="mt-1 block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs opacity-75">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/20 pt-5 text-sm">
            <p className="font-medium">{authUser.name}</p>
            <p className="mt-1 text-teal-100/85">{ROLE_LABEL[authUser.role]}</p>
            {isDemoMode && (
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-amber-200">
                Modo demonstracao
              </p>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="mt-5 w-full border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-white/10"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white/85">
          <div className="mx-auto w-full max-w-6xl px-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {activeSectionMeta.label}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {activeSectionMeta.description}
                </h1>
              </div>

              <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                Dia da operacao
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                />
              </label>
            </div>

            <p className="mt-3 text-sm text-slate-600">{formatDayLabel(selectedDate)}</p>

            {statusMessage && (
              <p className="mt-3 border-l-2 border-emerald-500 pl-3 text-sm text-emerald-700">
                {statusMessage}
              </p>
            )}
            {errorMessage && (
              <p className="mt-3 border-l-2 border-rose-500 pl-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            )}
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {isWorkspaceLoading ? (
            <section className="rise-in mx-auto w-full max-w-6xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">
              Carregando dados do workspace...
            </section>
          ) : activeSection === 'consultations' ? (
            <section className="rise-in mx-auto w-full max-w-6xl">
              <div className="grid gap-4 border border-slate-200 bg-white px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricLine label="Consultas do dia" value={String(appointmentMetrics.total)} />
                <MetricLine
                  label="Pendentes"
                  value={String(appointmentMetrics.pending)}
                />
                <MetricLine
                  label="Em atendimento"
                  value={String(appointmentMetrics.inProgress)}
                />
                <MetricLine
                  label="Concluidas"
                  value={String(appointmentMetrics.finished)}
                />
              </div>

              <div className="mt-5 overflow-hidden border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Calendario do dia
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Agenda por horario
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Duracao padrao por consulta: {clinicSettings.consultationDurationMinutes} minutos.
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    {nextConsultation
                      ? `Proxima consulta em destaque: ${formatTime(
                          nextConsultation.startsAt,
                        )} - ${nextConsultation.patient.name}.`
                      : 'Nao ha consultas pendentes para destaque neste dia.'}
                  </p>
                </div>

                <div className="divide-y divide-slate-200">
                  {consultationsCalendarSlots.map((slot, index) => {
                    const isFocusedConsultation =
                      slot.appointment?.id === selectedConsultationId;
                    const isNextConsultation =
                      slot.appointment?.id === nextConsultation?.id;

                    return (
                      <div
                        key={`${selectedDate}-${slot.time}`}
                        className={`agenda-row grid grid-cols-[82px_1fr] gap-3 px-4 py-3 ${
                          isNextConsultation
                            ? 'bg-amber-50/70'
                            : isFocusedConsultation
                            ? 'bg-teal-50/45'
                            : ''
                        }`}
                        style={{ animationDelay: `${index * 32}ms` }}
                      >
                        <div className="pt-1">
                          <p className="text-sm font-semibold text-slate-900">{slot.time}</p>
                        </div>

                        {slot.appointment ? (
                          <div
                            className={`rounded-md border px-3 py-3 ${
                              isNextConsultation
                                ? 'border-amber-300 bg-amber-50/80'
                                : isFocusedConsultation
                                ? 'border-teal-300 bg-teal-50/70'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {slot.appointment.patient.name}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {formatTime(slot.appointment.startsAt)} -{' '}
                                  {formatTime(slot.appointment.endsAt)} |{' '}
                                  {slot.appointment.reason}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Tutor: {slot.appointment.tutor.name} | Vet:{' '}
                                  {slot.appointment.veterinarianName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isNextConsultation && (
                                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                                    Proxima
                                  </span>
                                )}
                                <StatusBadge status={slot.appointment.status} />
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <TinyActionButton
                                title={isFocusedConsultation ? 'Prontuario ativo' : 'Prontuario'}
                                onClick={() =>
                                  onSelectConsultationForMedicalRecord(
                                    slot.appointment!.id,
                                  )
                                }
                                highlight
                              />
                              <TinyActionButton
                                title="Remarcar"
                                onClick={() => onOpenRescheduleDrawer(slot.appointment!)}
                                disabled={
                                  slot.appointment.status === 'COMPLETED' ||
                                  slot.appointment.status === 'CANCELED' ||
                                  slot.appointment.status === 'IN_PROGRESS'
                                }
                              />
                              <TinyActionButton
                                title="Confirmar"
                                onClick={() =>
                                  void onChangeAppointmentStatus(
                                    slot.appointment!.id,
                                    'CONFIRMED',
                                  )
                                }
                                disabled={
                                  slot.appointment.status === 'COMPLETED' ||
                                  slot.appointment.status === 'CANCELED'
                                }
                              />
                              <TinyActionButton
                                title="Atender"
                                onClick={() => onStartAttendance(slot.appointment!)}
                                disabled={
                                  slot.appointment.status === 'COMPLETED' ||
                                  slot.appointment.status === 'CANCELED'
                                }
                              />
                              <TinyActionButton
                                title="Concluir"
                                onClick={() =>
                                  void onChangeAppointmentStatus(
                                    slot.appointment!.id,
                                    'COMPLETED',
                                  )
                                }
                                highlight
                                disabled={
                                  slot.appointment.status === 'COMPLETED' ||
                                  slot.appointment.status === 'CANCELED'
                                }
                              />
                              <TinyActionButton
                                title="Cancelar"
                                onClick={() => onCancelAppointment(slot.appointment!.id)}
                                danger
                                disabled={
                                  slot.appointment.status === 'COMPLETED' ||
                                  slot.appointment.status === 'CANCELED'
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
                            Horario livre
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </section>
          ) : activeSection === 'medicalRecords' ? (
            <section className="rise-in mx-auto w-full max-w-6xl">
              <div
                id="medical-record-workspace"
                className="overflow-hidden border border-slate-200 bg-white"
              >
                <div className="grid xl:grid-cols-[300px_1fr]">
                  <aside className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 xl:border-b-0 xl:border-r">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Triagem do dia
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      Atendimentos para prontuario
                    </h3>
                    <p className="mt-2 text-xs text-slate-600">
                      Selecione uma consulta para abrir ou continuar o prontuario.
                    </p>

                    {sortedAppointments.length === 0 ? (
                      <p className="mt-5 text-sm text-slate-600">
                        Nenhuma consulta cadastrada para este dia.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {sortedAppointments.map((appointment) => {
                          const active = appointment.id === selectedConsultationId;
                          const isNext = appointment.id === nextConsultation?.id;

                          return (
                            <li key={appointment.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectConsultationForMedicalRecord(appointment.id)
                                }
                                className={`w-full border px-3 py-3 text-left transition ${
                                  active
                                    ? 'border-teal-300 bg-teal-50'
                                    : isNext
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatTime(appointment.startsAt)} - {appointment.patient.name}
                                  </p>
                                  {isNext && (
                                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                                      Proxima
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-slate-600">
                                  {appointment.reason}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {appointment.tutor.name}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </aside>

                  <div className="px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Prontuario clinico
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                          Registro de atendimento veterinario
                        </h3>
                      </div>
                      {selectedMedicalRecord && (
                        <MedicalRecordStatusBadge status={selectedMedicalRecord.status} />
                      )}
                    </div>

                    {!selectedConsultation ? (
                      <p className="mt-6 text-sm text-slate-600">
                        Selecione uma consulta na lateral para abrir o prontuario.
                      </p>
                    ) : isMedicalRecordLoading ? (
                      <p className="mt-6 text-sm text-slate-600">
                        Carregando prontuario da consulta selecionada...
                      </p>
                    ) : !selectedMedicalRecord ? (
                      <div className="mt-6 border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
                        <p className="text-sm text-slate-700">
                          O prontuario ainda nao foi iniciado para{' '}
                          <span className="font-semibold">
                            {selectedConsultation.patient.name}
                          </span>
                          .
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          Tutor: {selectedConsultation.tutor.name} | Vet:{' '}
                          {selectedConsultation.veterinarianName}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void onStartMedicalRecord();
                          }}
                          disabled={
                            isMedicalRecordLoading ||
                            isMedicalRecordSaving ||
                            isMedicalRecordFinalizing ||
                            selectedConsultation.status === 'CANCELED'
                          }
                          className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Iniciar prontuario
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-5">
                        <div className="grid gap-2 border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:grid-cols-2">
                          <p>
                            <span className="font-semibold text-slate-800">Paciente:</span>{' '}
                            {selectedConsultation.patient.name}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Tutor:</span>{' '}
                            {selectedConsultation.tutor.name}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Consulta:</span>{' '}
                            {formatDateTime(selectedConsultation.startsAt)}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Veterinario:</span>{' '}
                            {selectedConsultation.veterinarianName}
                          </p>
                        </div>

                        <div className="grid gap-4">
                          <label className="grid gap-1.5 text-sm text-slate-700">
                            Queixa principal *
                            <input
                              value={medicalRecordForm.chiefComplaint}
                              onChange={(event) =>
                                onMedicalRecordFieldChange(
                                  'chiefComplaint',
                                  event.target.value,
                                )
                              }
                              disabled={selectedConsultationIsFinalizedRecord}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm text-slate-700">
                            Inicio dos sintomas *
                            <input
                              value={medicalRecordForm.symptomsOnset}
                              onChange={(event) =>
                                onMedicalRecordFieldChange(
                                  'symptomsOnset',
                                  event.target.value,
                                )
                              }
                              disabled={selectedConsultationIsFinalizedRecord}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </label>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="grid gap-1.5 text-sm text-slate-700">
                              Historico clinico *
                              <textarea
                                rows={4}
                                value={medicalRecordForm.clinicalHistory}
                                onChange={(event) =>
                                  onMedicalRecordFieldChange(
                                    'clinicalHistory',
                                    event.target.value,
                                  )
                                }
                                disabled={selectedConsultationIsFinalizedRecord}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </label>

                            <label className="grid gap-1.5 text-sm text-slate-700">
                              Exame fisico *
                              <textarea
                                rows={4}
                                value={medicalRecordForm.physicalExam}
                                onChange={(event) =>
                                  onMedicalRecordFieldChange(
                                    'physicalExam',
                                    event.target.value,
                                  )
                                }
                                disabled={selectedConsultationIsFinalizedRecord}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </label>
                          </div>

                          <label className="grid gap-1.5 text-sm text-slate-700">
                            Diagnostico presuntivo *
                            <textarea
                              rows={3}
                              value={medicalRecordForm.presumptiveDiagnosis}
                              onChange={(event) =>
                                onMedicalRecordFieldChange(
                                  'presumptiveDiagnosis',
                                  event.target.value,
                                )
                              }
                              disabled={selectedConsultationIsFinalizedRecord}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </label>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="grid gap-1.5 text-sm text-slate-700">
                              Conduta *
                              <textarea
                                rows={4}
                                value={medicalRecordForm.conduct}
                                onChange={(event) =>
                                  onMedicalRecordFieldChange(
                                    'conduct',
                                    event.target.value,
                                  )
                                }
                                disabled={selectedConsultationIsFinalizedRecord}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </label>

                            <label className="grid gap-1.5 text-sm text-slate-700">
                              Orientacoes *
                              <textarea
                                rows={4}
                                value={medicalRecordForm.guidance}
                                onChange={(event) =>
                                  onMedicalRecordFieldChange(
                                    'guidance',
                                    event.target.value,
                                  )
                                }
                                disabled={selectedConsultationIsFinalizedRecord}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </label>
                          </div>

                          <label className="grid gap-1.5 text-sm text-slate-700">
                            Data sugerida para retorno
                            <input
                              type="date"
                              value={medicalRecordForm.recommendedReturnAt}
                              onChange={(event) =>
                                onMedicalRecordFieldChange(
                                  'recommendedReturnAt',
                                  event.target.value,
                                )
                              }
                              disabled={selectedConsultationIsFinalizedRecord}
                              className="max-w-[240px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              void onSaveMedicalRecordDraft();
                            }}
                            disabled={
                              isMedicalRecordSaving ||
                              isMedicalRecordFinalizing ||
                              selectedConsultationIsFinalizedRecord
                            }
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {isMedicalRecordSaving ? 'Salvando...' : 'Salvar rascunho'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void onFinalizeMedicalRecord();
                            }}
                            disabled={
                              isMedicalRecordSaving ||
                              isMedicalRecordFinalizing ||
                              !medicalRecordCanFinalize
                            }
                            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {isMedicalRecordFinalizing
                              ? 'Finalizando...'
                              : 'Finalizar prontuario'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void onPrepareReturnScheduling();
                            }}
                            disabled={
                              isMedicalRecordSaving ||
                              isMedicalRecordFinalizing ||
                              !selectedMedicalRecord ||
                              selectedMedicalRecord.status !== 'FINALIZED' ||
                              !medicalRecordForm.recommendedReturnAt
                            }
                            className="rounded-md border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            Agendar retorno (1 clique)
                          </button>
                        </div>

                        <p className="text-xs text-slate-500">
                          Campos com * sao obrigatorios para finalizacao do prontuario.
                        </p>

                        <div className="border-t border-slate-200 pt-5">
                          <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Historico do paciente
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                Linha do tempo de consultas para contexto clinico.
                              </p>
                            </div>

                            <label className="grid gap-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                              Buscar no historico
                              <input
                                value={patientHistorySearch}
                                onChange={(event) =>
                                  setPatientHistorySearch(event.target.value)
                                }
                                placeholder="Motivo, tutor ou veterinario"
                                className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-800 outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                              />
                            </label>
                          </div>

                          {isPatientHistoryLoading ? (
                            <p className="mt-4 text-sm text-slate-600">
                              Carregando historico de consultas...
                            </p>
                          ) : filteredPatientHistory.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-600">
                              Nenhuma consulta encontrada no historico com os filtros atuais.
                            </p>
                          ) : (
                            <ul className="mt-4 divide-y divide-slate-200 border border-slate-200 bg-slate-50/40">
                              {filteredPatientHistory.map((appointment) => {
                                const isCurrentConsultation =
                                  appointment.id === selectedConsultation.id;

                                return (
                                  <li
                                    key={`history-${appointment.id}`}
                                    className={`px-4 py-3 ${
                                      isCurrentConsultation ? 'bg-teal-50/70' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-900">
                                        {formatDateTime(appointment.startsAt)}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        {isCurrentConsultation && (
                                          <span className="rounded-full border border-teal-300 bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">
                                            Consulta atual
                                          </span>
                                        )}
                                        <StatusBadge status={appointment.status} />
                                      </div>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-700">
                                      {appointment.reason}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Veterinario: {appointment.veterinarianName} | Tutor:{' '}
                                      {appointment.tutor.name}
                                    </p>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : activeSection === 'scheduling' ? (
            <section className="rise-in mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[420px_1fr]">
              <form className="border border-slate-200 bg-white px-5 py-5" onSubmit={onCreateAppointment}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Novo agendamento
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Defina paciente, dia e horario
                </h3>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-1.5 text-sm text-slate-700">
                    Paciente
                    <select
                      required
                      value={appointmentForm.patientId}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({
                          ...current,
                          patientId: event.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                    >
                      <option value="">Selecione um paciente</option>
                      {patientOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-sm text-slate-700">
                    Veterinario responsavel
                    <input
                      required
                      value={appointmentForm.veterinarianName}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({
                          ...current,
                          veterinarianName: event.target.value,
                        }))
                      }
                      placeholder="Nome do veterinario"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm text-slate-700">
                    Motivo da consulta
                    <input
                      required
                      value={appointmentForm.reason}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Ex.: retorno, vacina, avaliacao"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                    />
                  </label>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Dias disponiveis
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {schedulingDaySummaries.map((day) => {
                        const active = day.dateIso === schedulingDate;

                        return (
                          <button
                            key={day.dateIso}
                            type="button"
                            onClick={() => onSelectSchedulingDate(day.dateIso)}
                            className={`rounded-md border px-2.5 py-2 text-left text-xs transition ${
                              active
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <p className="uppercase tracking-[0.12em]">
                              {formatWeekdayShort(day.dateIso)}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {formatShortDateLabel(day.dateIso)}
                            </p>
                            <p className={`mt-1 text-[11px] ${active ? 'text-white/80' : 'text-slate-500'}`}>
                              {day.isLoaded
                                ? `${day.freeCount} livre(s)`
                                : 'Carregando'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Horarios disponiveis
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{formatDayLabel(schedulingDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Proximo horario livre: {nextFreeSlot || 'Sem disponibilidade'}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {schedulingSlotsAvailability.map((slot) => (
                        <button
                          key={`${schedulingDate}-${slot.time}`}
                          type="button"
                          disabled={slot.blocked}
                          onClick={() =>
                            setAppointmentForm((current) => ({
                              ...current,
                              startsAt: slot.time,
                            }))
                          }
                          className={`rounded-md border px-2 py-2 text-xs font-medium transition ${
                            appointmentForm.startsAt === slot.time
                              ? 'border-teal-700 bg-teal-700 text-white'
                              : slot.blocked
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>

                    {isAvailabilityLoading && (
                      <p className="mt-2 text-xs text-slate-500">
                        Atualizando disponibilidade...
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    O horario final e calculado automaticamente pelo padrao da clinica (
                    {clinicSettings.consultationDurationMinutes} min).
                  </p>

                  <button
                    type="submit"
                    disabled={
                      isAppointmentSaving ||
                      patients.length === 0 ||
                      !appointmentForm.startsAt
                    }
                    className="mt-1 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isAppointmentSaving ? 'Salvando...' : 'Agendar consulta'}
                  </button>
                </div>
              </form>

              <div className="border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Disponibilidade do dia
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    {formatDayLabel(schedulingDate)}
                  </h3>
                </div>
                <ul className="divide-y divide-slate-200">
                  {schedulingSlotsAvailability.map((slot) => (
                    <li key={`overview-${schedulingDate}-${slot.time}`} className="px-5 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{slot.time}</p>
                          {slot.appointment ? (
                            <p className="text-slate-600">
                              {slot.appointment.patient.name} | {slot.appointment.reason}
                            </p>
                          ) : (
                            <p className="text-slate-500">Horario livre</p>
                          )}
                        </div>

                        {slot.appointment ? (
                          <StatusBadge status={slot.appointment.status} />
                        ) : (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Livre
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : activeSection === 'users' ? (
            <section className="rise-in mx-auto w-full max-w-6xl">
              {!canManageUsers ? (
                <div className="border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-800">
                  Seu perfil atual nao possui permissao para cadastrar ou editar usuarios.
                </div>
              ) : (
                <div className="grid gap-6">
                  <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                    <div className="border border-slate-200 bg-white px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Panorama de usuarios
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">
                        Estado atual da operacao
                      </h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <AuditMetricCard
                          label="Total"
                          value={String(profileMetrics.total)}
                          tone="neutral"
                        />
                        <AuditMetricCard
                          label="Ativos"
                          value={String(profileMetrics.active)}
                          tone="positive"
                        />
                        <AuditMetricCard
                          label="Inativos"
                          value={String(profileMetrics.inactive)}
                          tone={profileMetrics.inactive > 0 ? 'risk' : 'neutral'}
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200 bg-white px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Suspensao por inatividade
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">
                        Execucao de politica administrativa
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        A varredura considera o ultimo login do usuario e pode rodar em modo simulacao ou execucao real.
                      </p>

                      <div className="mt-4 grid gap-4 text-sm text-slate-700">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={inactivityPolicyForm.enabled}
                            onChange={(event) =>
                              setInactivityPolicyForm((current) => ({
                                ...current,
                                enabled: event.target.checked,
                              }))
                            }
                            disabled={isInactivityPolicySaving || isInactivityScanRunning}
                            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                          />
                          Politica ativa
                        </label>

                        <label className="grid gap-1.5">
                          Limite de inatividade (dias)
                          <input
                            type="number"
                            min={1}
                            max={3650}
                            step={1}
                            value={inactivityPolicyForm.maxInactiveDays}
                            onChange={(event) =>
                              setInactivityPolicyForm((current) => ({
                                ...current,
                                maxInactiveDays: event.target.value,
                              }))
                            }
                            disabled={isInactivityPolicySaving || isInactivityScanRunning}
                            className="max-w-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          />
                        </label>

                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Roles excluidas da varredura
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(['ADMIN', 'VETERINARIAN', 'RECEPTION'] as ActorRole[]).map(
                              (role) => {
                                const selected =
                                  inactivityPolicyForm.excludedRoles.includes(role);

                                return (
                                  <button
                                    key={`excluded-role-${role}`}
                                    type="button"
                                    onClick={() => onToggleInactivityExcludedRole(role)}
                                    disabled={
                                      isInactivityPolicySaving || isInactivityScanRunning
                                    }
                                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                                      selected
                                        ? 'border-teal-400 bg-teal-50 text-teal-800'
                                        : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                  >
                                    {ROLE_LABEL[role]}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>

                        {inactivityPolicyMaxDaysError && (
                          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            {inactivityPolicyMaxDaysError}
                          </p>
                        )}

                        <p className="text-xs text-slate-500">
                          Politica persistida atual: {inactivityPolicy?.enabled ? 'ativa' : 'inativa'} com{' '}
                          {inactivityPolicy?.maxInactiveDays ?? '--'} dia(s) e exclusoes em{' '}
                          {inactivityPolicy?.excludedRoles.join(', ') || 'nenhuma'}.
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={onDiscardInactivityPolicyChanges}
                          disabled={
                            isInactivityPolicySaving ||
                            isInactivityScanRunning ||
                            !hasPendingInactivityPolicyChanges
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={() => void onSaveInactivityPolicy()}
                          disabled={
                            isInactivityPolicySaving ||
                            isInactivityScanRunning ||
                            !hasPendingInactivityPolicyChanges ||
                            Boolean(inactivityPolicyMaxDaysError)
                          }
                          className="rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isInactivityPolicySaving ? 'Salvando...' : 'Salvar politica'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onRunInactivityScan(true)}
                          disabled={
                            isInactivityScanRunning ||
                            isInactivityPolicySaving ||
                            hasPendingInactivityPolicyChanges
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isInactivityScanRunning ? 'Processando...' : 'Simular'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onRunInactivityScan(false)}
                          disabled={
                            isInactivityScanRunning ||
                            isInactivityPolicySaving ||
                            hasPendingInactivityPolicyChanges
                          }
                          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Executar
                        </button>
                        <button
                          type="button"
                          onClick={() => void loadInactivityPolicy()}
                          disabled={isInactivityScanRunning || isInactivityPolicySaving}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Atualizar politica
                        </button>
                      </div>

                      {lastInactivityScanResult && (
                        <div className="mt-4 border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Ultima execucao
                          </p>
                          <p className="mt-2 text-sm text-slate-700">
                            Avaliados: {lastInactivityScanResult.evaluatedUsers} | Elegiveis:{' '}
                            {lastInactivityScanResult.matchedUsers} | Atualizados:{' '}
                            {lastInactivityScanResult.updatedUsers}
                          </p>
                          {lastInactivityScanResult.affectedUsers.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-slate-600">
                              {lastInactivityScanResult.affectedUsers
                                .slice(0, 3)
                                .map((candidate) => (
                                  <li key={`inactive-candidate-${candidate.id}`}>
                                    {candidate.name} ({candidate.role}) - ultimo login:{' '}
                                    {candidate.lastLoginAt
                                      ? formatDateTime(candidate.lastLoginAt)
                                      : 'nunca'}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
                  <form className="border border-slate-200 bg-white px-5 py-5" onSubmit={onCreateProfile}>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Cadastro de usuario
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">
                      Criar novo perfil
                    </h3>

                    <div className="mt-5 grid gap-4">
                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Nome completo
                        <input
                          required
                          value={profileForm.name}
                          onChange={(event) =>
                            setProfileForm((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                      </label>

                      <label className="grid gap-1.5 text-sm text-slate-700">
                        E-mail
                        <input
                          required
                          type="email"
                          value={profileForm.email}
                          onChange={(event) =>
                            setProfileForm((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Papel
                          <select
                            value={profileForm.role}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                role: event.target.value as ActorRole,
                              }))
                            }
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          >
                            <option value="ADMIN">Administrador</option>
                            <option value="VETERINARIAN">Veterinario</option>
                            <option value="RECEPTION">Recepcao</option>
                          </select>
                        </label>

                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Senha inicial
                          <input
                            required
                            type="password"
                            value={profileForm.password}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                password: event.target.value,
                              }))
                            }
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isProfileSaving}
                        className="mt-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        {isProfileSaving ? 'Salvando...' : 'Criar usuario'}
                      </button>
                    </div>
                  </form>

                  <div className="border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Usuarios da operacao
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">
                        Perfis cadastrados
                      </h3>
                    </div>

                    {profiles.length === 0 ? (
                      <p className="px-5 py-10 text-sm text-slate-600">
                        Nenhum perfil disponivel.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {sortProfiles(profiles).map((profile) => {
                          const isSelfProfile = profile.id === authUser.id;
                          const isSavingStatus = profileStatusSavingId === profile.id;

                          return (
                            <li
                              key={profile.id}
                              className="grid gap-3 px-5 py-3 lg:grid-cols-[1.2fr_auto_auto]"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-slate-900">
                                    {profile.name}
                                  </p>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                      profile.active
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {profile.active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{profile.email}</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Ultimo login:{' '}
                                  {profile.lastLoginAt
                                    ? formatDateTime(profile.lastLoginAt)
                                    : 'nunca registrado'}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Atualizado em {formatDateTime(profile.updatedAt)}
                                </p>
                              </div>

                              <div className="grid gap-1 text-left lg:text-right">
                                <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                  Papel
                                </label>
                                <select
                                  value={profile.role}
                                  onChange={(event) =>
                                    void onUpdateProfileRole(
                                      profile.id,
                                      event.target.value as ActorRole,
                                    )
                                  }
                                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                                >
                                  <option value="ADMIN">Administrador</option>
                                  <option value="VETERINARIAN">Veterinario</option>
                                  <option value="RECEPTION">Recepcao</option>
                                </select>
                              </div>

                              <div className="grid gap-1">
                                <button
                                  type="button"
                                  disabled={isSelfProfile || isSavingStatus}
                                  onClick={() =>
                                    void onUpdateProfileActive(
                                      profile.id,
                                      !profile.active,
                                    )
                                  }
                                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                                    profile.active
                                      ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  {isSavingStatus
                                    ? 'Salvando...'
                                    : profile.active
                                      ? 'Inativar'
                                      : 'Ativar'}
                                </button>
                                {isSelfProfile && (
                                  <p className="text-[11px] text-slate-500">
                                    Usuario da sessao atual
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  </div>
                </div>
              )}
            </section>
          ) : activeSection === 'audit' ? (
            <section className="rise-in mx-auto w-full max-w-6xl">
              {!canManageUsers ? (
                <div className="border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-800">
                  Apenas administradores podem visualizar a trilha de auditoria.
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-200 bg-white">
                  <div className="grid gap-4 border-b border-slate-200 px-5 py-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Seguranca operacional
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">
                        Trilha de auditoria
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Eventos sensiveis de autenticacao, mudanca de perfil e finalizacao de prontuario.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onExportAuditCsv}
                        disabled={isAuditLoading || filteredAuditEvents.length === 0}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadAuditEvents()}
                        disabled={isAuditLoading}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        {isAuditLoading ? 'Atualizando...' : 'Atualizar'}
                      </button>
                    </div>
                  </div>

                  <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Painel de seguranca
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <AuditMetricCard
                        label="Total"
                        value={String(auditSummary.totalEvents)}
                        tone="neutral"
                      />
                      <AuditMetricCard
                        label="Na visualizacao"
                        value={String(auditSummary.eventsInView)}
                        tone="neutral"
                      />
                      <AuditMetricCard
                        label="Ultimas 24h"
                        value={String(auditSummary.eventsLast24h)}
                        tone="neutral"
                      />
                      <AuditMetricCard
                        label="Risco 24h"
                        value={String(auditSummary.riskEventsLast24h)}
                        tone={
                          auditSummary.riskEventsLast24h > 0 ? 'risk' : 'positive'
                        }
                      />
                      <AuditMetricCard
                        label="Atores 24h"
                        value={String(auditSummary.uniqueActorsLast24h)}
                        tone="neutral"
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Ultimo evento:{' '}
                      {auditSummary.latestEventAt
                        ? formatDateTime(auditSummary.latestEventAt)
                        : 'sem registros recentes'}
                    </p>
                  </div>

                  <div className="border-b border-slate-200 px-5 py-3">
                    <div className="grid gap-3 lg:grid-cols-[1.2fr_auto_auto]">
                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Buscar por acao, entidade, resumo ou ID
                        <input
                          value={auditSearch}
                          onChange={(event) => setAuditSearch(event.target.value)}
                          placeholder="Ex.: LOGIN_LOCKED, MEDICAL_RECORD, user-123"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                      </label>

                      <label className="grid gap-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        Entidade
                        <select
                          value={auditEntityFilter}
                          onChange={(event) => setAuditEntityFilter(event.target.value)}
                          className="rounded-md border border-slate-300 px-2.5 py-2 text-xs outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        >
                          <option value="ALL">Todas</option>
                          {auditEntityOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        Acao
                        <select
                          value={auditActionFilter}
                          onChange={(event) => setAuditActionFilter(event.target.value)}
                          className="rounded-md border border-slate-300 px-2.5 py-2 text-xs outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        >
                          <option value="ALL">Todas</option>
                          {auditActionOptions.map((option) => (
                            <option key={option} value={option}>
                              {formatAuditAction(option)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  {!isAuditLoading && riskAuditEvents.length > 0 && (
                    <div className="border-b border-rose-200 bg-rose-50/45 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-rose-700">
                        Alertas de risco recentes
                      </p>
                      <ul className="mt-3 grid gap-2">
                        {riskAuditEvents.map((event) => (
                          <li
                            key={`risk-${event.id}`}
                            className="border border-rose-200 bg-white/80 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                                {formatAuditAction(event.action)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDateTime(event.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-800">
                              {event.summary ?? 'Evento sem resumo adicional'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isAuditLoading ? (
                    <p className="px-5 py-8 text-sm text-slate-600">Carregando eventos...</p>
                  ) : filteredAuditEvents.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-600">
                      Nenhum evento encontrado para o filtro informado.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {filteredAuditEvents.map((event) => (
                        <li
                          key={event.id}
                          className="grid gap-2 px-5 py-3 md:grid-cols-[180px_1fr_auto]"
                        >
                          <div>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${auditActionStyles(event.action)}`}
                            >
                              {formatAuditAction(event.action)}
                            </span>
                            <p className="mt-1 text-xs text-slate-500">{event.entity}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {event.summary ?? 'Evento sem resumo adicional'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Entity ID: {event.entityId} | Ator:{' '}
                              {event.actorId ?? 'sistema/nao identificado'}
                            </p>
                          </div>

                          <p className="text-xs text-slate-500">
                            {formatDateTime(event.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          ) : activeSection === 'patients' ? (
            <section className="rise-in mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[420px_1fr]">
              <form className="border border-slate-200 bg-white px-5 py-5" onSubmit={onCreatePatient}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Cadastro Integrado
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Tutor e paciente no mesmo formulario
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Para cadastrar outro animal de um tutor existente, localize primeiro pelo documento.
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="grid gap-2">
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Documento do tutor
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          required
                          value={patientForm.tutorDocument}
                          onChange={(event) =>
                            setPatientForm((current) => ({
                              ...current,
                              tutorDocument: event.target.value,
                              tutorResolvedId: '',
                              ...(current.tutorResolvedId
                                ? {
                                    tutorName: '',
                                    tutorPhone: '',
                                    tutorEmail: '',
                                    tutorAddress: '',
                                  }
                                : {}),
                            }))
                          }
                          placeholder="CPF/CNPJ/RG"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                        <button
                          type="button"
                          onClick={onLookupTutorByDocument}
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100"
                        >
                          Localizar
                        </button>
                      </div>
                    </label>
                    {isExistingTutorSelected ? (
                      <p className="text-xs text-emerald-700">
                        Tutor localizado: {selectedTutorByDocument?.name}. Prossiga para cadastrar outro animal.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Se nao localizar, preencha os dados do tutor para criar novo cadastro junto com o paciente.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Dados do tutor
                    </p>
                    <div className="mt-3 grid gap-3">
                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Nome completo
                        <input
                          required={!isExistingTutorSelected}
                          value={patientForm.tutorName}
                          onChange={(event) =>
                            setPatientForm((current) => ({
                              ...current,
                              tutorName: event.target.value,
                            }))
                          }
                          disabled={isExistingTutorSelected}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Telefone
                          <input
                            value={patientForm.tutorPhone}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                tutorPhone: event.target.value,
                              }))
                            }
                            disabled={isExistingTutorSelected}
                            placeholder="(11) 99999-0000"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>

                        <label className="grid gap-1.5 text-sm text-slate-700">
                          E-mail
                          <input
                            type="email"
                            value={patientForm.tutorEmail}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                tutorEmail: event.target.value,
                              }))
                            }
                            disabled={isExistingTutorSelected}
                            placeholder="contato@dominio.com"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>
                      </div>

                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Endereco
                        <input
                          value={patientForm.tutorAddress}
                          onChange={(event) =>
                            setPatientForm((current) => ({
                              ...current,
                              tutorAddress: event.target.value,
                            }))
                          }
                          disabled={isExistingTutorSelected}
                          placeholder="Rua, numero e complemento"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Dados do paciente
                    </p>
                    <div className="mt-3 grid gap-3">
                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Nome do paciente
                        <input
                          required
                          value={patientForm.name}
                          onChange={(event) =>
                            setPatientForm((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Especie
                          <input
                            required
                            value={patientForm.species}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                species: event.target.value,
                              }))
                            }
                            placeholder="Canino, Felino..."
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Raca
                          <input
                            value={patientForm.breed}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                breed: event.target.value,
                              }))
                            }
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Sexo
                          <select
                            value={patientForm.sex}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                sex: event.target.value as PatientSex,
                              }))
                            }
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          >
                            <option value="UNKNOWN">Nao informado</option>
                            <option value="MALE">Macho</option>
                            <option value="FEMALE">Femea</option>
                          </select>
                        </label>

                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Nascimento
                          <input
                            type="date"
                            value={patientForm.birthDate}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                birthDate: event.target.value,
                              }))
                            }
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          />
                        </label>

                        <label className="grid gap-1.5 text-sm text-slate-700">
                          Peso (kg)
                          <input
                            value={patientForm.currentWeight}
                            onChange={(event) =>
                              setPatientForm((current) => ({
                                ...current,
                                currentWeight: event.target.value,
                              }))
                            }
                            placeholder="Ex.: 12.5"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPatientSaving}
                    className="mt-1 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isPatientSaving ? 'Salvando...' : 'Salvar cadastro integrado'}
                  </button>
                </div>
              </form>

              <div className="border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Base clinica
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Pacientes e tutores ativos
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {sortedPatients.length} paciente(s) e {sortedTutors.length} tutor(es) cadastrados.
                  </p>
                </div>

                {sortedPatients.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-slate-600">
                    Nenhum paciente encontrado na base atual.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {sortedPatients.map((patient) => {
                      const tutor = sortedTutors.find((item) => item.id === patient.tutorId);

                      return (
                        <li key={patient.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_auto]">
                          <div>
                            <p className="text-base font-medium text-slate-900">{patient.name}</p>
                            <p className="mt-1 text-sm text-slate-700">
                              {patient.species}
                              {patient.breed ? ` - ${patient.breed}` : ''}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatSexLabel(patient.sex)}
                              {patient.birthDate
                                ? ` - Nascimento: ${new Date(patient.birthDate).toLocaleDateString('pt-BR')}`
                                : ''}
                              {typeof patient.currentWeight === 'number'
                                ? ` - ${patient.currentWeight.toFixed(1)} kg`
                                : ''}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {tutor?.name ?? 'Tutor nao encontrado'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {tutor?.phone || 'Sem telefone'}
                            </p>
                            {tutor?.email && (
                              <p className="text-xs text-slate-500">{tutor.email}</p>
                            )}
                          </div>

                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            {patient.id.slice(0, 8)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          ) : (
            <section className="rise-in mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[420px_1fr]">
              <div className="border border-slate-200 bg-white px-6 py-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Configuracoes da clinica
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Parametros de agenda
                </h3>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-1.5 text-sm text-slate-700">
                    Duracao padrao da consulta (min)
                    <input
                      type="number"
                      min={10}
                      max={180}
                      step={5}
                      value={clinicSettings.consultationDurationMinutes}
                      disabled={isClinicSettingsSaving}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        if (!Number.isFinite(parsed)) {
                          return;
                        }

                        setClinicSettings((current) => ({
                          ...current,
                          consultationDurationMinutes: Math.min(
                            180,
                            Math.max(10, parsed),
                          ),
                        }));
                        setAppointmentForm((current) => ({
                          ...current,
                          startsAt: '',
                        }));
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Inicio de expediente
                      <input
                        type="time"
                        value={clinicSettings.openingTime}
                        disabled={isClinicSettingsSaving}
                        onChange={(event) => {
                          setClinicSettings((current) => ({
                            ...current,
                            openingTime: event.target.value,
                          }));
                          setAppointmentForm((current) => ({
                            ...current,
                            startsAt: '',
                          }));
                        }}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Fim de expediente
                      <input
                        type="time"
                        value={clinicSettings.closingTime}
                        disabled={isClinicSettingsSaving}
                        onChange={(event) => {
                          setClinicSettings((current) => ({
                            ...current,
                            closingTime: event.target.value,
                          }));
                          setAppointmentForm((current) => ({
                            ...current,
                            startsAt: '',
                          }));
                        }}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>
                  </div>

                  {clinicScheduleValidationError && (
                    <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {clinicScheduleValidationError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onDiscardClinicSettingsChanges}
                      disabled={
                        isClinicSettingsSaving || !hasPendingClinicSettingsChanges
                      }
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Descartar alteracoes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onSaveClinicSettings();
                      }}
                      disabled={
                        isClinicSettingsSaving ||
                        !hasPendingClinicSettingsChanges ||
                        Boolean(clinicScheduleValidationError)
                      }
                      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isClinicSettingsSaving ? 'Salvando...' : 'Salvar configuracoes'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    {isDemoMode
                      ? 'Modo demonstracao: o salvamento vale somente para esta sessao.'
                      : 'As alteracoes salvas ficam persistidas para todos os acessos.'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 bg-white px-6 py-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Impacto imediato
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Regras ativas de agendamento
                </h3>
                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                  <li>
                    Duracao de consulta aplicada automaticamente: {' '}
                    <span className="font-semibold">
                      {clinicSettings.consultationDurationMinutes} min
                    </span>
                  </li>
                  <li>
                    Janelas de horario: {' '}
                    <span className="font-semibold">
                      {clinicSettings.openingTime} ate {clinicSettings.closingTime}
                    </span>
                  </li>
                  <li>
                    Horarios ocupados aparecem bloqueados para novas marcacoes.
                  </li>
                  <li>
                    {hasPendingClinicSettingsChanges
                      ? 'Existem alteracoes pendentes de salvamento.'
                      : 'Todas as configuracoes atuais ja estao salvas.'}
                  </li>
                </ul>
              </div>
            </section>
          )}
        </div>

        {isRescheduleDrawerOpen && rescheduleTargetAppointment && (
          <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[1px]">
            <div className="absolute inset-y-0 right-0 w-full max-w-4xl overflow-y-auto border-l border-slate-300 bg-white shadow-[0_20px_60px_-20px_rgba(2,6,23,0.45)]">
              <div className="grid min-h-full lg:grid-cols-[320px_1fr]">
                <aside className="border-b border-slate-200 bg-gradient-to-b from-teal-900 via-teal-800 to-teal-900 px-5 py-5 text-teal-50 lg:border-b-0 lg:border-r lg:border-teal-700/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-teal-200/90">
                    Remarcacao
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    {rescheduleTargetAppointment.patient.name}
                  </h3>
                  <p className="mt-1 text-sm text-teal-100/90">
                    {rescheduleTargetAppointment.reason}
                  </p>

                  <div className="mt-5 space-y-2 text-sm">
                    <p>
                      Horario atual:{' '}
                      <span className="font-semibold">
                        {formatDateTime(rescheduleTargetAppointment.startsAt)}
                      </span>
                    </p>
                    <p>
                      Veterinario:{' '}
                      <span className="font-semibold">
                        {rescheduleTargetAppointment.veterinarianName}
                      </span>
                    </p>
                    <p>
                      Tutor:{' '}
                      <span className="font-semibold">
                        {rescheduleTargetAppointment.tutor.name}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onCloseRescheduleDrawer}
                    className="mt-6 rounded-md border border-white/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-50 transition hover:bg-white/10"
                  >
                    Fechar painel
                  </button>
                </aside>

                <section className="px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Escolha nova data e horario
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Disponibilidade para remarcacao
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Horarios bloqueados ja possuem consulta ativa para este veterinario.
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rescheduleDaySummaries.map((day) => {
                      const active = day.dateIso === rescheduleDate;

                      return (
                        <button
                          key={`reschedule-day-${day.dateIso}`}
                          type="button"
                          onClick={() => setRescheduleDate(day.dateIso)}
                          className={`border px-3 py-2 text-left transition ${
                            active
                              ? 'border-teal-400 bg-teal-50'
                              : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40'
                          }`}
                        >
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {formatWeekdayShort(day.dateIso)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatShortDateLabel(day.dateIso)}
                          </p>
                          <p
                            className={`mt-1 text-xs ${
                              day.freeCount > 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {day.isLoaded
                              ? `${day.freeCount} horario(s) livre(s)`
                              : 'Carregando...'}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Horarios disponiveis
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{formatDayLabel(rescheduleDate)}</p>

                    {isAvailabilityLoading ? (
                      <p className="mt-3 text-sm text-slate-600">Atualizando disponibilidade...</p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        {rescheduleSlotsAvailability.map((slot) => {
                          const active = slot.time === rescheduleStartsAt;

                          return (
                            <button
                              key={`reschedule-slot-${rescheduleDate}-${slot.time}`}
                              type="button"
                              disabled={slot.blocked}
                              onClick={() => setRescheduleStartsAt(slot.time)}
                              className={`border px-3 py-2 text-sm font-medium transition ${
                                slot.blocked
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                  : active
                                  ? 'border-teal-500 bg-teal-100 text-teal-900'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!isAvailabilityLoading &&
                      rescheduleSlotsAvailability.every((slot) => slot.blocked) && (
                        <p className="mt-3 text-sm text-rose-700">
                          Este dia nao possui horarios livres para remarcacao.
                        </p>
                      )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onCloseRescheduleDrawer}
                      disabled={isRescheduleSaving}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onRescheduleAppointment();
                      }}
                      disabled={isRescheduleSaving || !rescheduleStartsAt}
                      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isRescheduleSaving ? 'Salvando...' : 'Confirmar remarcacao'}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function sortTutors(data: Tutor[]): Tutor[] {
  return [...data].sort((first, second) => first.name.localeCompare(second.name));
}

function sortPatients(data: Patient[]): Patient[] {
  return [...data].sort((first, second) => first.name.localeCompare(second.name));
}

function sortProfiles(data: AccessProfile[]): AccessProfile[] {
  return [...data].sort((first, second) => {
    return first.name.localeCompare(second.name);
  });
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ').trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

function getAuditReferenceTimestamp(events: AuditEvent[]): number {
  const latest = [...events].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )[0];

  if (!latest) {
    return 0;
  }

  return new Date(latest.createdAt).getTime();
}

function formatAuditAction(action: string): string {
  return action.replace(/_/g, ' ');
}

function isRiskAuditAction(action: string): boolean {
  return (
    action.includes('FAILED') ||
    action.includes('LOCKED') ||
    action.includes('BLOCKED') ||
    action.includes('DEACTIVATED')
  );
}

function auditActionStyles(action: string): string {
  if (action.includes('DEACTIVATED')) {
    return 'bg-rose-100 text-rose-700';
  }

  if (action.includes('LOCKED') || action.includes('BLOCKED')) {
    return 'bg-rose-100 text-rose-700';
  }

  if (action.includes('ACTIVATED')) {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (action.includes('FAILED')) {
    return 'bg-amber-100 text-amber-800';
  }

  if (action.includes('SUCCESS') || action.includes('FINALIZED')) {
    return 'bg-emerald-100 text-emerald-700';
  }

  return 'bg-slate-100 text-slate-700';
}

function AuditMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'risk' | 'positive';
}) {
  const toneClass =
    tone === 'risk'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : tone === 'positive'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-slate-200 bg-slate-50 text-slate-800';

  return (
    <div className={`border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 pb-2 last:border-b-0 sm:border-b-0 sm:border-r sm:pb-0 sm:last:border-r-0">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const visual = STATUS_VISUAL[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium ${visual.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${visual.dotClass}`} />
      {visual.label}
    </span>
  );
}

function MedicalRecordStatusBadge({ status }: { status: MedicalRecordStatus }) {
  const visual = MEDICAL_RECORD_STATUS_VISUAL[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium ${visual.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${visual.dotClass}`} />
      {visual.label}
    </span>
  );
}

function TinyActionButton({
  title,
  onClick,
  highlight = false,
  danger = false,
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  highlight?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1 text-xs transition ${
        danger
          ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
          : highlight
          ? 'border-teal-600 text-teal-700 hover:bg-teal-50'
          : 'border-slate-300 text-slate-700 hover:bg-slate-100'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {title}
    </button>
  );
}
