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

type AccessProfile = {
  id: string;
  name: string;
  email: string;
  role: ActorRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceSection =
  | 'consultations'
  | 'scheduling'
  | 'users'
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
  },
): SlotAvailability[] {
  return slots.map((slot) => {
    const slotStart = new Date(joinDateAndTime(dateIso, slot));
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

    const appointment = appointments.find((item) => {
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

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.includes('AUTH_INVALID_CREDENTIALS')) {
    return 'E-mail ou senha invalidos.';
  }

  if (error.message.includes('API_TIMEOUT')) {
    return 'API indisponivel no momento (timeout).';
  }

  if (error.message.includes('NETWORK_ERROR')) {
    return 'API indisponivel no momento (erro de conexao).';
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
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-user-vet',
      name: 'Veterinario EasyVet',
      email: 'vet@easyvet.local',
      role: 'VETERINARIAN',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-user-reception',
      name: 'Recepcao EasyVet',
      email: 'recepcao@easyvet.local',
      role: 'RECEPTION',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    tutors,
    patients,
    appointments,
    profiles,
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
  const [clinicSettings, setClinicSettings] = useState<ClinicScheduleSettings>({
    consultationDurationMinutes: 30,
    openingTime: '08:00',
    closingTime: '18:00',
  });

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, Appointment[]>
  >({});
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);

  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAppointmentSaving, setIsAppointmentSaving] = useState(false);
  const [isPatientSaving, setIsPatientSaving] = useState(false);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);

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

      const sortedDayAppointments = sortAppointments(appointmentData);

      setTutors(tutorData);
      setPatients(patientData);
      setAppointments(sortedDayAppointments);
      setAppointmentsByDate((current) => ({
        ...current,
        [selectedDate]: sortedDayAppointments,
      }));

      if (authUser.role === 'ADMIN') {
        const profileData = await request<AccessProfile[]>('/profiles');
        setProfiles(profileData);
      } else {
        setProfiles([]);
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
      setAppointmentsByDate((current) => ({
        ...current,
        [selectedDate]: demoDataset.appointments,
      }));
      setProfiles(demoDataset.profiles);

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
    setIsDemoMode(false);
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

  async function onChangeAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
  ) {
    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        const updateStatus = (data: Appointment[]) =>
          data.map((item) => {
            if (item.id !== appointmentId) {
              return item;
            }

            return {
              ...item,
              status,
            };
          });

        setAppointments((current) => sortAppointments(updateStatus(current)));
        setAppointmentsByDate((current) => {
          const dayAppointments = current[selectedDate] ?? [];
          return {
            ...current,
            [selectedDate]: sortAppointments(updateStatus(dayAppointments)),
          };
        });
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
          createdAt: now,
          updatedAt: now,
        };

        setProfiles((current) => sortProfiles([created, ...current]));
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
        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id !== profileId) {
              return profile;
            }

            return {
              ...profile,
              role,
              updatedAt: new Date().toISOString(),
            };
          }),
        );
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
      }

      setStatusMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao atualizar papel do perfil.'),
      );
    }
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
                </div>

                <div className="divide-y divide-slate-200">
                  {consultationsCalendarSlots.map((slot, index) => (
                    <div
                      key={`${selectedDate}-${slot.time}`}
                      className="agenda-row grid grid-cols-[82px_1fr] gap-3 px-4 py-3"
                      style={{ animationDelay: `${index * 32}ms` }}
                    >
                      <div className="pt-1">
                        <p className="text-sm font-semibold text-slate-900">{slot.time}</p>
                      </div>

                      {slot.appointment ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
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
                            <StatusBadge status={slot.appointment.status} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
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
                              onClick={() =>
                                void onChangeAppointmentStatus(
                                  slot.appointment!.id,
                                  'IN_PROGRESS',
                                )
                              }
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
                  ))}
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
                        Perfis ativos
                      </h3>
                    </div>

                    {profiles.length === 0 ? (
                      <p className="px-5 py-10 text-sm text-slate-600">
                        Nenhum perfil disponivel.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {sortProfiles(profiles).map((profile) => (
                          <li
                            key={profile.id}
                            className="grid gap-3 px-5 py-3 md:grid-cols-[1fr_auto]"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {profile.name}
                              </p>
                              <p className="text-xs text-slate-500">{profile.email}</p>
                            </div>

                            <div className="grid gap-1 text-right">
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
                              <p className="text-[11px] text-slate-500">
                                Atualizado em {formatDateTime(profile.updatedAt)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
                </ul>
              </div>
            </section>
          )}
        </div>
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
