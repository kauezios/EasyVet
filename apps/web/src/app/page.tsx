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

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);

  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAppointmentSaving, setIsAppointmentSaving] = useState(false);
  const [isTutorSaving, setIsTutorSaving] = useState(false);
  const [isPatientSaving, setIsPatientSaving] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    veterinarianName: '',
    startsAt: '09:00',
    endsAt: '09:30',
    reason: '',
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    role: 'VETERINARIAN' as ActorRole,
    password: 'easyvet123',
  });

  const [tutorForm, setTutorForm] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: '',
  });

  const [patientForm, setPatientForm] = useState({
    tutorId: '',
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

      setTutors(tutorData);
      setPatients(patientData);
      setAppointments(sortAppointments(appointmentData));

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
      setPatientForm((current) => ({
        ...current,
        tutorId: current.tutorId || tutorData[0]?.id || '',
      }));

      setIsDemoMode(false);
    } catch {
      const demoDataset = createDemoDataset(selectedDate, authUser.name);

      setTutors(demoDataset.tutors);
      setPatients(demoDataset.patients);
      setAppointments(demoDataset.appointments);
      setProfiles(demoDataset.profiles);

      setAppointmentForm((current) => ({
        ...current,
        patientId: current.patientId || demoDataset.patients[0]?.id || '',
        veterinarianName: current.veterinarianName || authUser.name,
      }));
      setPatientForm((current) => ({
        ...current,
        tutorId: current.tutorId || demoDataset.tutors[0]?.id || '',
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
    if (tutors.length === 0) {
      return;
    }

    const tutorExists = tutors.some((tutor) => tutor.id === patientForm.tutorId);
    if (!tutorExists) {
      setPatientForm((current) => ({
        ...current,
        tutorId: tutors[0]?.id ?? '',
      }));
    }
  }, [patientForm.tutorId, tutors]);

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
    setProfiles([]);
    setIsDemoMode(false);
    setErrorMessage('');
    setStatusMessage('Sessao finalizada.');
    setActiveSection('consultations');
    setTutorForm({
      name: '',
      document: '',
      phone: '',
      email: '',
      address: '',
    });
    setPatientForm({
      tutorId: '',
      name: '',
      species: '',
      breed: '',
      sex: 'UNKNOWN',
      birthDate: '',
      currentWeight: '',
    });
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

      const startsAt = joinDateAndTime(selectedDate, appointmentForm.startsAt);
      const endsAt = joinDateAndTime(selectedDate, appointmentForm.endsAt);

      if (isDemoMode) {
        const created: Appointment = {
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

        setAppointments((current) => sortAppointments([...current, created]));
      } else {
        const created = await request<Appointment>('/appointments', {
          method: 'POST',
          body: JSON.stringify({
            patientId: appointmentForm.patientId,
            veterinarianName: appointmentForm.veterinarianName.trim(),
            startsAt,
            endsAt,
            reason: appointmentForm.reason.trim(),
          }),
        });

        setAppointments((current) => sortAppointments([...current, created]));
      }

      setAppointmentForm((current) => ({
        ...current,
        reason: '',
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
        setAppointments((current) =>
          current.map((item) => {
            if (item.id !== appointmentId) {
              return item;
            }

            return {
              ...item,
              status,
            };
          }),
        );
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
          current.map((item) => {
            if (item.id !== appointmentId) {
              return item;
            }

            return updated;
          }),
        );
      }

      setStatusMessage('Status atualizado com sucesso.');
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(error, 'Falha ao atualizar status da consulta.'),
      );
    }
  }

  async function onCreateTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsTutorSaving(true);

    try {
      const name = tutorForm.name.trim();
      if (!name) {
        throw new Error('Informe o nome do tutor.');
      }

      const tutorPayload = {
        name,
        document: normalizeOptionalText(tutorForm.document),
        phone: normalizeOptionalText(tutorForm.phone),
        email: normalizeOptionalText(tutorForm.email),
        address: normalizeOptionalText(tutorForm.address),
      };

      let createdTutor: Tutor;

      if (isDemoMode) {
        createdTutor = {
          id: `demo-tutor-${Date.now()}`,
          name,
          document: tutorPayload.document ?? null,
          phone: tutorPayload.phone ?? null,
          email: tutorPayload.email ?? null,
          address: tutorPayload.address ?? null,
        };
      } else {
        createdTutor = await request<Tutor>('/tutors', {
          method: 'POST',
          body: JSON.stringify(tutorPayload),
        });
      }

      setTutors((current) => sortTutors([createdTutor, ...current]));
      setPatientForm((current) => ({
        ...current,
        tutorId: createdTutor.id,
      }));
      setTutorForm({
        name: '',
        document: '',
        phone: '',
        email: '',
        address: '',
      });
      setStatusMessage('Tutor cadastrado com sucesso.');
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error, 'Falha ao cadastrar tutor.'));
    } finally {
      setIsTutorSaving(false);
    }
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
      const name = patientForm.name.trim();
      const species = patientForm.species.trim();

      if (!patientForm.tutorId) {
        throw new Error('Selecione um tutor para continuar.');
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

      const patientPayload = {
        tutorId: patientForm.tutorId,
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
        name: '',
        species: '',
        breed: '',
        sex: 'UNKNOWN',
        birthDate: '',
        currentWeight: '',
      }));
      setStatusMessage('Paciente cadastrado com sucesso.');
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
                <div className="grid grid-cols-[90px_1fr_1fr_1fr_auto] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span>Horario</span>
                  <span>Paciente</span>
                  <span>Tutor</span>
                  <span>Veterinario</span>
                  <span className="text-right">Acoes</span>
                </div>

                {sortedAppointments.length === 0 ? (
                  <p className="px-4 py-10 text-sm text-slate-600">
                    Nao ha consultas para a data selecionada.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {sortedAppointments.map((appointment, index) => (
                      <li
                        key={appointment.id}
                        className="agenda-row"
                        style={{ animationDelay: `${index * 45}ms` }}
                      >
                        <div className="grid grid-cols-[90px_1fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatTime(appointment.startsAt)}
                            </p>
                            <p className="text-xs text-slate-500">{appointment.reason}</p>
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {appointment.patient.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {appointment.patient.species}
                              {appointment.patient.breed
                                ? ` - ${appointment.patient.breed}`
                                : ''}
                            </p>
                          </div>

                          <div>
                            <p className="font-medium text-slate-800">
                              {appointment.tutor.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {appointment.tutor.phone || 'Sem telefone'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusBadge status={appointment.status} />
                            <span className="text-slate-700">
                              {appointment.veterinarianName}
                            </span>
                          </div>

                          <div className="flex justify-end gap-1.5">
                            <TinyActionButton
                              title="Confirmar"
                              onClick={() =>
                                void onChangeAppointmentStatus(
                                  appointment.id,
                                  'CONFIRMED',
                                )
                              }
                              disabled={appointment.status === 'COMPLETED'}
                            />
                            <TinyActionButton
                              title="Atender"
                              onClick={() =>
                                void onChangeAppointmentStatus(
                                  appointment.id,
                                  'IN_PROGRESS',
                                )
                              }
                              disabled={appointment.status === 'COMPLETED'}
                            />
                            <TinyActionButton
                              title="Concluir"
                              onClick={() =>
                                void onChangeAppointmentStatus(
                                  appointment.id,
                                  'COMPLETED',
                                )
                              }
                              highlight
                              disabled={appointment.status === 'COMPLETED'}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : activeSection === 'scheduling' ? (
            <section className="rise-in mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[420px_1fr]">
              <form className="border border-slate-200 bg-white px-5 py-5" onSubmit={onCreateAppointment}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Novo agendamento
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Preencha os dados da consulta
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Inicio
                      <input
                        required
                        type="time"
                        value={appointmentForm.startsAt}
                        onChange={(event) =>
                          setAppointmentForm((current) => ({
                            ...current,
                            startsAt: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Fim
                      <input
                        required
                        type="time"
                        value={appointmentForm.endsAt}
                        onChange={(event) =>
                          setAppointmentForm((current) => ({
                            ...current,
                            endsAt: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>
                  </div>

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

                  <button
                    type="submit"
                    disabled={isAppointmentSaving || patients.length === 0}
                    className="mt-1 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isAppointmentSaving ? 'Salvando...' : 'Agendar consulta'}
                  </button>
                </div>
              </form>

              <div className="border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Planejamento do dia
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Timeline de atendimentos
                  </h3>
                </div>

                {sortedAppointments.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-slate-600">
                    Sem consultas registradas para este dia.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {sortedAppointments.map((appointment) => (
                      <li key={appointment.id} className="px-5 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}
                            </p>
                            <p className="text-slate-700">
                              {appointment.patient.name} | {appointment.reason}
                            </p>
                          </div>

                          <StatusBadge status={appointment.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
              <div className="grid gap-6">
                <form className="border border-slate-200 bg-white px-5 py-5" onSubmit={onCreateTutor}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Cadastro de tutor
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Novo responsavel
                  </h3>

                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Nome completo
                      <input
                        required
                        value={tutorForm.name}
                        onChange={(event) =>
                          setTutorForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Documento
                        <input
                          value={tutorForm.document}
                          onChange={(event) =>
                            setTutorForm((current) => ({
                              ...current,
                              document: event.target.value,
                            }))
                          }
                          placeholder="CPF ou RG"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm text-slate-700">
                        Telefone
                        <input
                          value={tutorForm.phone}
                          onChange={(event) =>
                            setTutorForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="(11) 99999-0000"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                        />
                      </label>
                    </div>

                    <label className="grid gap-1.5 text-sm text-slate-700">
                      E-mail
                      <input
                        type="email"
                        value={tutorForm.email}
                        onChange={(event) =>
                          setTutorForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="contato@dominio.com"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Endereco
                      <input
                        value={tutorForm.address}
                        onChange={(event) =>
                          setTutorForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        placeholder="Rua, numero e complemento"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isTutorSaving}
                      className="mt-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-65"
                    >
                      {isTutorSaving ? 'Salvando...' : 'Cadastrar tutor'}
                    </button>
                  </div>
                </form>

                <form className="border border-slate-200 bg-white px-5 py-5" onSubmit={onCreatePatient}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Cadastro de paciente
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Novo animal
                  </h3>

                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      Tutor responsavel
                      <select
                        required
                        value={patientForm.tutorId}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            tutorId: event.target.value,
                          }))
                        }
                        disabled={sortedTutors.length === 0}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">Selecione</option>
                        {sortedTutors.map((tutor) => (
                          <option key={tutor.id} value={tutor.id}>
                            {tutor.name}
                          </option>
                        ))}
                      </select>
                    </label>

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
                        disabled={sortedTutors.length === 0}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                          disabled={sortedTutors.length === 0}
                          placeholder="Canino, Felino..."
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                          disabled={sortedTutors.length === 0}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                          disabled={sortedTutors.length === 0}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                          disabled={sortedTutors.length === 0}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                          disabled={sortedTutors.length === 0}
                          placeholder="Ex.: 12.5"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-teal-500 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isPatientSaving || sortedTutors.length === 0}
                      className="mt-1 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-65"
                    >
                      {isPatientSaving ? 'Salvando...' : 'Cadastrar paciente'}
                    </button>

                    {sortedTutors.length === 0 && (
                      <p className="text-xs text-amber-700">
                        Cadastre um tutor antes de registrar pacientes.
                      </p>
                    )}
                  </div>
                </form>
              </div>

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
            <section className="rise-in mx-auto w-full max-w-6xl border border-slate-200 bg-white px-6 py-8">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Configuracoes
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Proximas entregas desta area
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li>Padroes de notificacao para equipe clinica.</li>
                <li>Preferencias de impressao de receituarios e anexos.</li>
                <li>Regras de horarios e duracao padrao para atendimento.</li>
              </ul>
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
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1 text-xs transition ${
        highlight
          ? 'border-teal-600 text-teal-700 hover:bg-teal-50'
          : 'border-slate-300 text-slate-700 hover:bg-slate-100'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {title}
    </button>
  );
}
