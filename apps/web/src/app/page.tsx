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

type Tutor = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
};

type Patient = {
  id: string;
  tutorId: string;
  name: string;
  species: string;
  breed: string | null;
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
};

type SideMode = 'schedule' | 'record' | 'profiles';
type ActorRole = 'ADMIN' | 'VETERINARIAN' | 'RECEPTION';

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

type AccessProfile = {
  id: string;
  name: string;
  email: string;
  role: ActorRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type MedicalRecordForm = {
  chiefComplaint: string;
  symptomsOnset: string;
  clinicalHistory: string;
  physicalExam: string;
  presumptiveDiagnosis: string;
  conduct: string;
  guidance: string;
  recommendedReturnAt: string;
};

type StatusVisual = {
  label: string;
  stripe: string;
  text: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const STATUS_VISUAL: Record<AppointmentStatus, StatusVisual> = {
  SCHEDULED: {
    label: 'Agendada',
    stripe: 'bg-slate-300',
    text: 'text-slate-600',
  },
  CONFIRMED: {
    label: 'Confirmada',
    stripe: 'bg-cyan-500',
    text: 'text-cyan-700',
  },
  IN_PROGRESS: {
    label: 'Em atendimento',
    stripe: 'bg-amber-500',
    text: 'text-amber-700',
  },
  COMPLETED: {
    label: 'Concluida',
    stripe: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  CANCELED: {
    label: 'Cancelada',
    stripe: 'bg-rose-500',
    text: 'text-rose-700',
  },
  NO_SHOW: {
    label: 'Nao compareceu',
    stripe: 'bg-fuchsia-500',
    text: 'text-fuchsia-700',
  },
};

const ROLE_OPTIONS: Array<{ value: ActorRole; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'VETERINARIAN', label: 'Veterinario' },
  { value: 'RECEPTION', label: 'Recepcao' },
];

function emptyMedicalRecordForm(): MedicalRecordForm {
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

function toLocalISODate(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDateLabel(dateIso: string): string {
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

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function recordToForm(record: MedicalRecord): MedicalRecordForm {
  return {
    chiefComplaint: record.chiefComplaint ?? '',
    symptomsOnset: record.symptomsOnset ?? '',
    clinicalHistory: record.clinicalHistory ?? '',
    physicalExam: record.physicalExam ?? '',
    presumptiveDiagnosis: record.presumptiveDiagnosis ?? '',
    conduct: record.conduct ?? '',
    guidance: record.guidance ?? '',
    recommendedReturnAt: record.recommendedReturnAt
      ? record.recommendedReturnAt.slice(0, 10)
      : '',
  };
}

export default function Home() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<
    Record<string, MedicalRecord>
  >({});

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [sideMode, setSideMode] = useState<SideMode>('schedule');
  const [activeRole, setActiveRole] = useState<ActorRole>('VETERINARIAN');
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalISODate(new Date()),
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordSaving, setIsRecordSaving] = useState(false);
  const [isProfilesLoading, setIsProfilesLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    veterinarianName: '',
    startsAt: '09:00',
    endsAt: '09:30',
    reason: '',
  });

  const [recordForm, setRecordForm] =
    useState<MedicalRecordForm>(emptyMedicalRecordForm());
  const [authForm, setAuthForm] = useState({
    email: 'vet@easyvet.local',
    password: 'easyvet123',
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    role: 'VETERINARIAN' as ActorRole,
    password: 'easyvet123',
  });

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId],
  );

  const selectedRecord = useMemo(() => {
    if (!selectedAppointmentId) {
      return null;
    }

    return medicalRecords[selectedAppointmentId] ?? null;
  }, [medicalRecords, selectedAppointmentId]);

  const activeAppointments = useMemo(
    () => appointments.filter((item) => item.status !== 'CANCELED'),
    [appointments],
  );
  const canFinalizeRecord = activeRole !== 'RECEPTION';
  const canManageProfiles = activeRole === 'ADMIN';

  const metrics = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(
      (item) => item.status === 'CONFIRMED',
    ).length;
    const inProgress = appointments.filter(
      (item) => item.status === 'IN_PROGRESS',
    ).length;
    const completed = appointments.filter(
      (item) => item.status === 'COMPLETED',
    ).length;

    return { total, confirmed, inProgress, completed };
  }, [appointments]);

  const request = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      try {
        const response = await fetch(`${API_BASE}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(authToken
              ? {
                  Authorization: `Bearer ${authToken}`,
                }
              : {}),
            ...(options?.headers ?? {}),
          },
          cache: 'no-store',
        });

        const payload = (await response.json()) as
          | ApiEnvelope<T>
          | ApiErrorEnvelope;

        if (!response.ok) {
          const apiError = payload as ApiErrorEnvelope;
          throw new Error(`${apiError.error.code}: ${apiError.error.message}`);
        }

        return (payload as ApiEnvelope<T>).data;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error(
            'API_TIMEOUT: Tempo limite de resposta da API excedido',
          );
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    [activeRole, authToken],
  );

  const loadCoreData = useCallback(async () => {
    const [tutorData, patientData] = await Promise.all([
      request<Tutor[]>('/tutors'),
      request<Patient[]>('/patients'),
    ]);

    setTutors(tutorData);
    setPatients(patientData);

    if (!appointmentForm.patientId && patientData.length > 0) {
      setAppointmentForm((current) => ({ ...current, patientId: patientData[0].id }));
    }
  }, [appointmentForm.patientId, request]);

  const loadAppointments = useCallback(
    async (date: string) => {
      const data = await request<Appointment[]>(`/appointments?date=${date}`);
      setAppointments(data);
    },
    [request],
  );

  const loadDemoData = useCallback((date: string) => {
    const demoTutors: Tutor[] = [
      {
        id: 'demo-tutor-1',
        name: 'Marina Araujo',
        document: '123.456.789-10',
        phone: '(11) 99999-1001',
      },
      {
        id: 'demo-tutor-2',
        name: 'Carlos Mendes',
        document: '987.654.321-00',
        phone: '(11) 98888-2202',
      },
    ];

    const demoPatients: Patient[] = [
      {
        id: 'demo-patient-1',
        tutorId: 'demo-tutor-1',
        name: 'Thor',
        species: 'Canino',
        breed: 'Labrador',
      },
      {
        id: 'demo-patient-2',
        tutorId: 'demo-tutor-2',
        name: 'Mia',
        species: 'Felino',
        breed: 'Siames',
      },
    ];

    const demoAppointments: Appointment[] = [
      {
        id: 'demo-appt-1',
        patientId: 'demo-patient-1',
        tutorId: 'demo-tutor-1',
        veterinarianName: 'Dra. Camila Souza',
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
        veterinarianName: 'Dr. Rafael Lima',
        startsAt: `${date}T10:00:00`,
        endsAt: `${date}T10:30:00`,
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
    ];

    const demoRecords: Record<string, MedicalRecord> = {
      'demo-appt-1': {
        id: 'demo-record-1',
        appointmentId: 'demo-appt-1',
        status: 'DRAFT',
        chiefComplaint: 'Prurido em regiao cervical',
        symptomsOnset: 'Ha 3 dias',
        clinicalHistory: 'Paciente ativo, sem alteracao de apetite.',
        physicalExam: '',
        presumptiveDiagnosis: '',
        conduct: '',
        guidance: '',
        recommendedReturnAt: null,
        finalizedAt: null,
      },
    };

    const now = new Date().toISOString();
    const demoProfiles: AccessProfile[] = [
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

    setTutors(demoTutors);
    setPatients(demoPatients);
    setAppointments(demoAppointments);
    setMedicalRecords(demoRecords);
    setProfiles(demoProfiles);
    setAppointmentForm((current) => ({
      ...current,
      patientId: demoPatients[0]?.id ?? '',
      veterinarianName: current.veterinarianName || 'Dra. Camila Souza',
    }));
    setIsDemoMode(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        await loadCoreData();
        await loadAppointments(selectedDate);
        setIsDemoMode(false);
      } catch {
        loadDemoData(selectedDate);
        setStatusMessage(
          'Modo demonstracao ativo: API indisponivel, mas a tela segue funcional.',
        );
        setErrorMessage('');
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [loadAppointments, loadCoreData, loadDemoData, selectedDate]);

  useEffect(() => {
    if (!selectedAppointmentId) {
      return;
    }

    const exists = appointments.some((item) => item.id === selectedAppointmentId);
    if (!exists) {
      setSelectedAppointmentId(null);
      setSideMode('schedule');
      setRecordForm(emptyMedicalRecordForm());
    }
  }, [appointments, selectedAppointmentId]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setActiveRole(authUser.role);
  }, [authUser]);

  const loadProfiles = useCallback(async () => {
    if (!authUser || !canManageProfiles) {
      return;
    }

    setIsProfilesLoading(true);

    try {
      if (isDemoMode) {
        return;
      }

      const data = await request<AccessProfile[]>('/profiles');
      setProfiles(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar perfis.';
      setErrorMessage(message);
    } finally {
      setIsProfilesLoading(false);
    }
  }, [authUser, canManageProfiles, isDemoMode, request]);

  useEffect(() => {
    if (sideMode !== 'profiles') {
      return;
    }

    void loadProfiles();
  }, [loadProfiles, sideMode]);

  const openMedicalRecord = useCallback(
    async (appointment: Appointment) => {
      setStatusMessage('');
      setErrorMessage('');
      setSideMode('record');
      setSelectedAppointmentId(appointment.id);

      if (isDemoMode) {
        const existing = medicalRecords[appointment.id];
        if (existing) {
          setRecordForm(recordToForm(existing));
          return;
        }

        const created: MedicalRecord = {
          id: `demo-record-${Date.now()}`,
          appointmentId: appointment.id,
          status: 'DRAFT',
          chiefComplaint: '',
          symptomsOnset: '',
          clinicalHistory: '',
          physicalExam: '',
          presumptiveDiagnosis: '',
          conduct: '',
          guidance: '',
          recommendedReturnAt: null,
          finalizedAt: null,
        };

        setMedicalRecords((current) => ({
          ...current,
          [appointment.id]: created,
        }));
        setRecordForm(recordToForm(created));
        return;
      }

      try {
        const started = await request<MedicalRecord>(
          `/appointments/${appointment.id}/medical-record/start`,
          {
            method: 'POST',
          },
        );

        setMedicalRecords((current) => ({
          ...current,
          [appointment.id]: started,
        }));
        setRecordForm(recordToForm(started));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Falha ao abrir prontuario da consulta.';
        setErrorMessage(message);
      }
    },
    [isDemoMode, medicalRecords, request],
  );

  async function onCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        const patient = patients.find((item) => item.id === appointmentForm.patientId);
        const tutor = tutors.find((item) => item.id === patient?.tutorId);

        if (!patient || !tutor) {
          throw new Error('Paciente ou tutor invalido para agendamento.');
        }

        const created: Appointment = {
          id: `demo-appt-${Date.now()}`,
          patientId: patient.id,
          tutorId: tutor.id,
          veterinarianName: appointmentForm.veterinarianName,
          startsAt: joinDateAndTime(selectedDate, appointmentForm.startsAt),
          endsAt: joinDateAndTime(selectedDate, appointmentForm.endsAt),
          reason: appointmentForm.reason,
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

        setAppointments((current) =>
          [...current, created].sort((a, b) => {
            return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
          }),
        );
        setAppointmentForm((current) => ({
          ...current,
          reason: '',
        }));
        setStatusMessage('Consulta agendada com sucesso (demonstracao).');
        return;
      }

      const created = await request<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: appointmentForm.patientId,
          veterinarianName: appointmentForm.veterinarianName,
          startsAt: joinDateAndTime(selectedDate, appointmentForm.startsAt),
          endsAt: joinDateAndTime(selectedDate, appointmentForm.endsAt),
          reason: appointmentForm.reason,
        }),
      });

      setAppointments((current) =>
        [...current, created].sort((a, b) => {
          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        }),
      );
      setAppointmentForm((current) => ({
        ...current,
        reason: '',
      }));
      setStatusMessage('Consulta agendada com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao agendar consulta.';
      setErrorMessage(message);
    }
  }

  async function onChangeStatus(id: string, status: AppointmentStatus) {
    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        setAppointments((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                }
              : item,
          ),
        );
        setStatusMessage('Status atualizado (demonstracao).');
        return;
      }

      const updated = await request<Appointment>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setAppointments((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setStatusMessage('Status atualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar status.';
      setErrorMessage(message);
    }
  }

  async function onSaveRecordDraft() {
    if (!selectedAppointmentId) {
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsRecordSaving(true);

    try {
      const draftPayload = {
        chiefComplaint: normalizeOptionalText(recordForm.chiefComplaint),
        symptomsOnset: normalizeOptionalText(recordForm.symptomsOnset),
        clinicalHistory: normalizeOptionalText(recordForm.clinicalHistory),
        physicalExam: normalizeOptionalText(recordForm.physicalExam),
        presumptiveDiagnosis: normalizeOptionalText(recordForm.presumptiveDiagnosis),
        conduct: normalizeOptionalText(recordForm.conduct),
        guidance: normalizeOptionalText(recordForm.guidance),
        recommendedReturnAt:
          normalizeOptionalText(recordForm.recommendedReturnAt) ?? undefined,
      };

      if (isDemoMode) {
        const existing = medicalRecords[selectedAppointmentId] ?? {
          id: `demo-record-${Date.now()}`,
          appointmentId: selectedAppointmentId,
          status: 'DRAFT' as MedicalRecordStatus,
          chiefComplaint: null,
          symptomsOnset: null,
          clinicalHistory: null,
          physicalExam: null,
          presumptiveDiagnosis: null,
          conduct: null,
          guidance: null,
          recommendedReturnAt: null,
          finalizedAt: null,
        };

        const updated: MedicalRecord = {
          ...existing,
          status: 'DRAFT',
          chiefComplaint: draftPayload.chiefComplaint ?? null,
          symptomsOnset: draftPayload.symptomsOnset ?? null,
          clinicalHistory: draftPayload.clinicalHistory ?? null,
          physicalExam: draftPayload.physicalExam ?? null,
          presumptiveDiagnosis: draftPayload.presumptiveDiagnosis ?? null,
          conduct: draftPayload.conduct ?? null,
          guidance: draftPayload.guidance ?? null,
          recommendedReturnAt: draftPayload.recommendedReturnAt ?? null,
        };

        setMedicalRecords((current) => ({
          ...current,
          [selectedAppointmentId]: updated,
        }));
        setStatusMessage('Prontuario salvo como rascunho (demonstracao).');
        return;
      }

      const updated = await request<MedicalRecord>(
        `/appointments/${selectedAppointmentId}/medical-record/draft`,
        {
          method: 'PUT',
          body: JSON.stringify(draftPayload),
        },
      );

      setMedicalRecords((current) => ({
        ...current,
        [selectedAppointmentId]: updated,
      }));
      setStatusMessage('Prontuario salvo como rascunho.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao salvar rascunho de prontuario.';
      setErrorMessage(message);
    } finally {
      setIsRecordSaving(false);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsAuthenticating(true);

    try {
      if (isDemoMode) {
        const email = authForm.email.trim().toLowerCase();
        const password = authForm.password.trim();

        if (password !== 'easyvet123') {
          throw new Error('AUTH_INVALID_CREDENTIALS: Senha invalida no modo demo.');
        }

        const demoUsers: Record<string, AuthUser> = {
          'admin@easyvet.local': {
            id: 'demo-user-admin',
            name: 'Administrador EasyVet',
            email: 'admin@easyvet.local',
            role: 'ADMIN',
            active: true,
          },
          'vet@easyvet.local': {
            id: 'demo-user-vet',
            name: 'Veterinario EasyVet',
            email: 'vet@easyvet.local',
            role: 'VETERINARIAN',
            active: true,
          },
          'recepcao@easyvet.local': {
            id: 'demo-user-reception',
            name: 'Recepcao EasyVet',
            email: 'recepcao@easyvet.local',
            role: 'RECEPTION',
            active: true,
          },
        };

        const user = demoUsers[email];
        if (!user) {
          throw new Error('AUTH_INVALID_CREDENTIALS: Usuario nao encontrado no modo demo.');
        }

        setAuthToken('demo-session-token');
        setAuthUser(user);
        setActiveRole(user.role);
        setStatusMessage(`Sessao iniciada como ${user.name} (demonstracao).`);
        return;
      }

      const session = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });

      setAuthToken(session.accessToken);
      setAuthUser(session.user);
      setActiveRole(session.user.role);
      setStatusMessage(`Sessao iniciada como ${session.user.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao autenticar.';
      setErrorMessage(message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  function onLogout() {
    setAuthToken('');
    setAuthUser(null);
    setSideMode('schedule');
    setStatusMessage('Sessao encerrada.');
  }

  async function onCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsProfileSaving(true);

    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase(),
        role: profileForm.role,
        password: profileForm.password,
      };

      if (!payload.name || !payload.email || !payload.password) {
        throw new Error('Preencha nome, e-mail e senha para criar o perfil.');
      }

      if (isDemoMode) {
        if (profiles.some((item) => item.email === payload.email)) {
          throw new Error('PROFILE_EMAIL_ALREADY_EXISTS: E-mail ja cadastrado.');
        }

        const created: AccessProfile = {
          id: `demo-user-${Date.now()}`,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setProfiles((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setProfileForm((current) => ({
          ...current,
          name: '',
          email: '',
        }));
        setStatusMessage('Perfil criado (demonstracao).');
        return;
      }

      const created = await request<AccessProfile>('/profiles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setProfiles((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setProfileForm((current) => ({
        ...current,
        name: '',
        email: '',
      }));
      setStatusMessage('Perfil criado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar perfil.';
      setErrorMessage(message);
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function onUpdateProfileRole(profileId: string, role: ActorRole) {
    setStatusMessage('');
    setErrorMessage('');

    try {
      if (isDemoMode) {
        setProfiles((current) =>
          current.map((item) =>
            item.id === profileId
              ? {
                  ...item,
                  role,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        setStatusMessage('Perfil atualizado (demonstracao).');
        return;
      }

      const updated = await request<AccessProfile>(`/profiles/${profileId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });

      setProfiles((current) =>
        current.map((item) => (item.id === profileId ? updated : item)),
      );
      setStatusMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao atualizar perfil.';
      setErrorMessage(message);
    }
  }

  async function onFinalizeRecord() {
    if (!canFinalizeRecord) {
      setErrorMessage('Perfil de recepcao nao pode finalizar prontuario.');
      return;
    }

    if (!selectedAppointmentId) {
      setErrorMessage('Selecione uma consulta para finalizar o prontuario.');
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setIsRecordSaving(true);

    try {
      const finalizePayload = {
        chiefComplaint: recordForm.chiefComplaint,
        symptomsOnset: recordForm.symptomsOnset,
        clinicalHistory: recordForm.clinicalHistory,
        physicalExam: recordForm.physicalExam,
        presumptiveDiagnosis: recordForm.presumptiveDiagnosis,
        conduct: recordForm.conduct,
        guidance: recordForm.guidance,
        recommendedReturnAt:
          normalizeOptionalText(recordForm.recommendedReturnAt) ?? undefined,
      };

      if (isDemoMode) {
        const required = [
          finalizePayload.chiefComplaint,
          finalizePayload.symptomsOnset,
          finalizePayload.clinicalHistory,
          finalizePayload.physicalExam,
          finalizePayload.presumptiveDiagnosis,
          finalizePayload.conduct,
          finalizePayload.guidance,
        ];

        const hasMissing = required.some((value) => value.trim().length === 0);
        if (hasMissing) {
          throw new Error(
            'MEDICAL_RECORD_REQUIRED_FIELDS_MISSING: Preencha todos os campos obrigatorios para finalizar.',
          );
        }

        const existing = medicalRecords[selectedAppointmentId] ?? {
          id: `demo-record-${Date.now()}`,
          appointmentId: selectedAppointmentId,
          status: 'DRAFT' as MedicalRecordStatus,
          chiefComplaint: null,
          symptomsOnset: null,
          clinicalHistory: null,
          physicalExam: null,
          presumptiveDiagnosis: null,
          conduct: null,
          guidance: null,
          recommendedReturnAt: null,
          finalizedAt: null,
        };

        const finalized: MedicalRecord = {
          ...existing,
          status: 'FINALIZED',
          chiefComplaint: finalizePayload.chiefComplaint,
          symptomsOnset: finalizePayload.symptomsOnset,
          clinicalHistory: finalizePayload.clinicalHistory,
          physicalExam: finalizePayload.physicalExam,
          presumptiveDiagnosis: finalizePayload.presumptiveDiagnosis,
          conduct: finalizePayload.conduct,
          guidance: finalizePayload.guidance,
          recommendedReturnAt: finalizePayload.recommendedReturnAt ?? null,
          finalizedAt: new Date().toISOString(),
        };

        setMedicalRecords((current) => ({
          ...current,
          [selectedAppointmentId]: finalized,
        }));
        setAppointments((current) =>
          current.map((item) =>
            item.id === selectedAppointmentId
              ? { ...item, status: 'COMPLETED' }
              : item,
          ),
        );
        setStatusMessage('Prontuario finalizado (demonstracao).');
        return;
      }

      const finalized = await request<MedicalRecord>(
        `/appointments/${selectedAppointmentId}/medical-record/finalize`,
        {
          method: 'PUT',
          body: JSON.stringify(finalizePayload),
        },
      );

      setMedicalRecords((current) => ({
        ...current,
        [selectedAppointmentId]: finalized,
      }));
      setAppointments((current) =>
        current.map((item) =>
          item.id === selectedAppointmentId
            ? { ...item, status: 'COMPLETED' }
            : item,
        ),
      );
      setStatusMessage('Prontuario finalizado com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao finalizar prontuario.';
      setErrorMessage(message);
    } finally {
      setIsRecordSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-slate-200/90 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal-700 rise-in">
            EasyVet Workspace
          </p>
          <div className="mt-2 grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div className="rise-in [animation-delay:120ms]">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                Agenda Clinica e Prontuario
              </h1>
              {isDemoMode && (
                <p className="mt-2 inline-flex items-center rounded-sm bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  Modo demonstracao
                </p>
              )}
              <div className="mt-3 grid max-w-2xl gap-3 border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="active-role"
                    className="text-xs uppercase tracking-[0.18em] text-slate-500"
                  >
                    Perfil ativo
                  </label>
                  <select
                    id="active-role"
                    value={activeRole}
                    onChange={(event) =>
                      setActiveRole(event.target.value as ActorRole)
                    }
                    disabled={Boolean(authUser)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none ring-2 ring-transparent transition focus:ring-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {authUser && (
                    <span className="text-xs text-slate-500">
                      Sincronizado com sessao autenticada.
                    </span>
                  )}
                </div>

                {authUser ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-700">
                      Conectado como <span className="font-medium">{authUser.name}</span>{' '}
                      ({authUser.role})
                    </p>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Encerrar sessao
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onLogin} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="email"
                      required
                      value={authForm.email}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="E-mail de acesso"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                    />
                    <input
                      type="password"
                      required
                      value={authForm.password}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Senha"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                    />
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAuthenticating ? 'Entrando...' : 'Entrar'}
                    </button>
                  </form>
                )}

                {isDemoMode && (
                  <p className="text-xs text-slate-500">
                    Demo: use `admin@easyvet.local`, `vet@easyvet.local` ou
                    `recepcao@easyvet.local` com senha `easyvet123`.
                  </p>
                )}
              </div>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
                Workspace operacional para agendar consultas e registrar prontuarios
                com finalizacao assistida por campos obrigatorios.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {formatDateLabel(selectedDate)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rise-in [animation-delay:220ms]">
              <MetricBlock label="Consultas" value={String(metrics.total)} />
              <MetricBlock label="Confirmadas" value={String(metrics.confirmed)} />
              <MetricBlock
                label="Em atendimento"
                value={String(metrics.inProgress)}
              />
              <MetricBlock label="Concluidas" value={String(metrics.completed)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-0 px-4 py-6 md:grid-cols-[1.62fr_1fr] md:px-8">
        <section className="border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Timeline do dia
              </p>
              <p className="text-sm text-slate-700">{formatDateLabel(selectedDate)}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
              />
              <button
                type="button"
                onClick={() => void loadAppointments(selectedDate)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Atualizar
              </button>
            </div>
          </header>

          {(statusMessage || errorMessage) && (
            <div
              className={`border-b px-4 py-3 text-sm md:px-6 ${
                errorMessage
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {errorMessage || statusMessage}
            </div>
          )}

          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <p className="px-6 py-8 text-sm text-slate-500">Carregando agenda...</p>
            ) : appointments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">
                Nenhuma consulta para esta data.
              </p>
            ) : (
              appointments.map((item, index) => {
                const visual = STATUS_VISUAL[item.status];
                const hasRecord = Boolean(medicalRecords[item.id]);

                return (
                  <article
                    key={item.id}
                    className="agenda-row px-4 py-4 md:px-6"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <div className="grid gap-3 md:grid-cols-[120px_1fr_auto] md:items-center">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">
                          {formatTime(item.startsAt)}
                        </p>
                        <p className="text-xs text-slate-500">
                          ate {formatTime(item.endsAt)}
                        </p>
                      </div>

                      <div className="min-w-0 border-l border-slate-200 pl-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${visual.stripe}`} />
                          <p className="truncate text-base font-medium text-slate-900">
                            {item.patient.name}
                          </p>
                          <span className={`text-xs font-medium ${visual.text}`}>
                            {visual.label}
                          </span>
                          {hasRecord && (
                            <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                              Prontuario
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.patient.species}
                          {item.patient.breed ? ` - ${item.patient.breed}` : ''} - Tutor:{' '}
                          {item.tutor.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Vet: {item.veterinarianName} - Motivo: {item.reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusButton
                          title="Confirmar"
                          onClick={() => onChangeStatus(item.id, 'CONFIRMED')}
                        />
                        <StatusButton
                          title="Iniciar"
                          onClick={() => onChangeStatus(item.id, 'IN_PROGRESS')}
                        />
                        <StatusButton
                          title="Concluir"
                          onClick={() => onChangeStatus(item.id, 'COMPLETED')}
                        />
                        <StatusButton
                          title="Prontuario"
                          highlight
                          onClick={() => {
                            void openMedicalRecord(item);
                          }}
                        />
                        <StatusButton
                          title="Cancelar"
                          danger
                          onClick={() => onChangeStatus(item.id, 'CANCELED')}
                        />
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="border-x border-b border-slate-200 bg-white md:border-l-0 md:border-t">
          <div className="grid grid-cols-3 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setSideMode('schedule')}
              className={`px-4 py-3 text-left text-xs uppercase tracking-[0.18em] transition md:px-6 ${
                sideMode === 'schedule'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              Agendamento
            </button>
            <button
              type="button"
              onClick={() => setSideMode('record')}
              className={`px-4 py-3 text-left text-xs uppercase tracking-[0.18em] transition md:px-6 ${
                sideMode === 'record'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              Prontuario
            </button>
            <button
              type="button"
              onClick={() => setSideMode('profiles')}
              className={`px-4 py-3 text-left text-xs uppercase tracking-[0.18em] transition md:px-6 ${
                sideMode === 'profiles'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              Perfis
            </button>
          </div>

          {sideMode === 'schedule' ? (
            <>
              <div className="border-b border-slate-200 px-4 py-4 md:px-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Novo agendamento
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Preencha os campos e registre a consulta do dia.
                </p>
              </div>

              <form className="grid gap-3 px-4 py-4 md:px-6" onSubmit={onCreateAppointment}>
                <select
                  required
                  value={appointmentForm.patientId}
                  onChange={(event) =>
                    setAppointmentForm((current) => ({
                      ...current,
                      patientId: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                >
                  <option value="">Selecione o paciente</option>
                  {patients.map((patient) => {
                    const tutor = tutors.find((item) => item.id === patient.tutorId);
                    return (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} ({tutor?.name ?? 'Tutor'})
                      </option>
                    );
                  })}
                </select>

                <input
                  required
                  value={appointmentForm.veterinarianName}
                  onChange={(event) =>
                    setAppointmentForm((current) => ({
                      ...current,
                      veterinarianName: event.target.value,
                    }))
                  }
                  placeholder="Veterinario responsavel"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    required
                    value={appointmentForm.startsAt}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                  />
                  <input
                    type="time"
                    required
                    value={appointmentForm.endsAt}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({
                        ...current,
                        endsAt: event.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                  />
                </div>

                <input
                  required
                  value={appointmentForm.reason}
                  onChange={(event) =>
                    setAppointmentForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Motivo da consulta"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                />

                <button
                  type="submit"
                  className="mt-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                  disabled={patients.length === 0}
                >
                  Agendar consulta
                </button>

                {patients.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Cadastre pacientes para habilitar o agendamento.
                  </p>
                )}
              </form>

              <div className="border-t border-slate-200 px-4 py-4 md:px-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Resumo rapido
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-slate-500">Tutores</dt>
                  <dd className="text-right font-medium text-slate-900">{tutors.length}</dd>
                  <dt className="text-slate-500">Pacientes</dt>
                  <dd className="text-right font-medium text-slate-900">{patients.length}</dd>
                  <dt className="text-slate-500">Ativas</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {activeAppointments.length}
                  </dd>
                </dl>
              </div>
            </>
          ) : sideMode === 'record' ? (
            <>
              <div className="border-b border-slate-200 px-4 py-4 md:px-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Prontuario clinico
                </p>
                {!selectedAppointment ? (
                  <p className="mt-1 text-sm text-slate-700">
                    Selecione o botao Prontuario em uma consulta da timeline para iniciar.
                  </p>
                ) : (
                  <div className="mt-2 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">
                      {selectedAppointment.patient.name}
                    </p>
                    <p>
                      Vet: {selectedAppointment.veterinarianName} -{' '}
                      {formatTime(selectedAppointment.startsAt)}
                    </p>
                    {selectedRecord?.status === 'FINALIZED' &&
                      selectedRecord.finalizedAt && (
                        <p className="mt-1 text-emerald-700">
                          Finalizado em {formatDateTime(selectedRecord.finalizedAt)}
                        </p>
                      )}
                  </div>
                )}
              </div>

              <div className="grid gap-3 px-4 py-4 md:px-6">
                <RecordField
                  label="Queixa principal"
                  value={recordForm.chiefComplaint}
                  onChange={(value) =>
                    setRecordForm((current) => ({ ...current, chiefComplaint: value }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordField
                  label="Inicio dos sintomas"
                  value={recordForm.symptomsOnset}
                  onChange={(value) =>
                    setRecordForm((current) => ({ ...current, symptomsOnset: value }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordArea
                  label="Historico clinico"
                  value={recordForm.clinicalHistory}
                  onChange={(value) =>
                    setRecordForm((current) => ({ ...current, clinicalHistory: value }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordArea
                  label="Exame fisico"
                  value={recordForm.physicalExam}
                  onChange={(value) =>
                    setRecordForm((current) => ({ ...current, physicalExam: value }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordField
                  label="Diagnostico presuntivo"
                  value={recordForm.presumptiveDiagnosis}
                  onChange={(value) =>
                    setRecordForm((current) => ({
                      ...current,
                      presumptiveDiagnosis: value,
                    }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordArea
                  label="Conduta"
                  value={recordForm.conduct}
                  onChange={(value) =>
                    setRecordForm((current) => ({ ...current, conduct: value }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordArea
                  label="Orientacoes ao tutor"
                  value={recordForm.guidance}
                  onChange={(value) =>
                    setRecordForm((current) => ({ ...current, guidance: value }))
                  }
                  disabled={!selectedAppointment}
                  required
                />

                <RecordField
                  label="Retorno recomendado"
                  type="date"
                  value={recordForm.recommendedReturnAt}
                  onChange={(value) =>
                    setRecordForm((current) => ({
                      ...current,
                      recommendedReturnAt: value,
                    }))
                  }
                  disabled={!selectedAppointment}
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void onSaveRecordDraft()}
                    disabled={!selectedAppointment || isRecordSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Salvar rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => void onFinalizeRecord()}
                    disabled={
                      !selectedAppointment || isRecordSaving || !canFinalizeRecord
                    }
                    className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Finalizar prontuario
                  </button>
                </div>
                {!canFinalizeRecord && (
                  <p className="text-xs text-amber-700">
                    Perfil de recepcao possui acesso somente de leitura no fluxo
                    de finalizacao.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-4 md:px-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Gestao de perfis
                </p>
                {!authUser ? (
                  <p className="mt-1 text-sm text-slate-700">
                    Realize login para acessar a administracao de perfis.
                  </p>
                ) : !canManageProfiles ? (
                  <p className="mt-1 text-sm text-amber-700">
                    Acesso restrito: somente administradores podem gerenciar perfis.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-700">
                    Crie usuarios operacionais e ajuste o papel de acesso da equipe.
                  </p>
                )}
              </div>

              {!authUser ? (
                <div className="px-4 py-5 text-sm text-slate-500 md:px-6">
                  Use o bloco de acesso no topo da pagina para iniciar sessao.
                </div>
              ) : !canManageProfiles ? (
                <div className="px-4 py-5 text-sm text-amber-700 md:px-6">
                  Seu perfil atual e <span className="font-medium">{activeRole}</span>.
                  Solicite permissao de administrador para continuar.
                </div>
              ) : (
                <>
                  <form
                    className="grid gap-3 border-b border-slate-200 px-4 py-4 md:px-6"
                    onSubmit={onCreateProfile}
                  >
                    <input
                      required
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Nome completo"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                    />
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="E-mail profissional"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={profileForm.role}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            role: event.target.value as ActorRole,
                          }))
                        }
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="password"
                        required
                        value={profileForm.password}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        placeholder="Senha inicial"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isProfileSaving}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProfileSaving ? 'Salvando...' : 'Criar perfil'}
                    </button>
                  </form>

                  <div className="border-b border-slate-200 px-4 py-3 md:px-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Equipe cadastrada
                    </p>
                  </div>

                  <div className="max-h-[360px] overflow-auto">
                    {isProfilesLoading ? (
                      <p className="px-4 py-6 text-sm text-slate-500 md:px-6">
                        Carregando perfis...
                      </p>
                    ) : profiles.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-500 md:px-6">
                        Nenhum perfil cadastrado.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {profiles.map((profile) => (
                          <li
                            key={profile.id}
                            className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto] md:px-6"
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
                                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
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
                </>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusButton({
  title,
  onClick,
  danger = false,
  highlight = false,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        danger
          ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
          : highlight
            ? 'border-teal-300 text-teal-700 hover:bg-teal-50'
            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
      }`}
    >
      {title}
    </button>
  );
}

function RecordField({
  label,
  value,
  onChange,
  disabled,
  required = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
  type?: 'text' | 'date';
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span>
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

function RecordArea({
  label,
  value,
  onChange,
  disabled,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span>
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={3}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}
