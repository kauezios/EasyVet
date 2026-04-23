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

type StatusVisual = {
  label: string;
  stripe: string;
  text: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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

function joinDateAndTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export default function Home() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(toLocalISODate(new Date()));
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    veterinarianName: '',
    startsAt: '09:00',
    endsAt: '09:30',
    reason: '',
  });

  const activeAppointments = useMemo(
    () => appointments.filter((item) => item.status !== 'CANCELED'),
    [appointments],
  );

  const metrics = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((item) => item.status === 'CONFIRMED').length;
    const inProgress = appointments.filter((item) => item.status === 'IN_PROGRESS').length;
    const completed = appointments.filter((item) => item.status === 'COMPLETED').length;

    return { total, confirmed, inProgress, completed };
  }, [appointments]);

  const request = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      cache: 'no-store',
    });

    const payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;

    if (!response.ok) {
      const apiError = payload as ApiErrorEnvelope;
      throw new Error(`${apiError.error.code}: ${apiError.error.message}`);
    }

    return (payload as ApiEnvelope<T>).data;
  }, []);

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

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        await loadCoreData();
        await loadAppointments(selectedDate);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao carregar agenda.';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [loadAppointments, loadCoreData, selectedDate]);

  async function onCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    try {
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

      setAppointments((current) => [...current, created].sort((a, b) => {
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      }));
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
      const updated = await request<Appointment>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setAppointments((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatusMessage('Status atualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar status.';
      setErrorMessage(message);
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
                Agenda Clinica
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
                Painel de operacao diaria para organizar consultas, acompanhar status e reduzir
                conflito de horario por veterinario.
              </p>
              <p className="mt-2 text-sm text-slate-500">{formatDateLabel(selectedDate)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 rise-in [animation-delay:220ms]">
              <MetricBlock label="Consultas" value={String(metrics.total)} />
              <MetricBlock label="Confirmadas" value={String(metrics.confirmed)} />
              <MetricBlock label="Em atendimento" value={String(metrics.inProgress)} />
              <MetricBlock label="Concluidas" value={String(metrics.completed)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-0 px-4 py-6 md:grid-cols-[1.55fr_1fr] md:px-8">
        <section className="border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timeline do dia</p>
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

                return (
                  <article
                    key={item.id}
                    className="agenda-row px-4 py-4 md:px-6"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <div className="grid gap-3 md:grid-cols-[120px_1fr_auto] md:items-center">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{formatTime(item.startsAt)}</p>
                        <p className="text-xs text-slate-500">ate {formatTime(item.endsAt)}</p>
                      </div>

                      <div className="min-w-0 border-l border-slate-200 pl-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${visual.stripe}`} />
                          <p className="truncate text-base font-medium text-slate-900">
                            {item.patient.name}
                          </p>
                          <span className={`text-xs font-medium ${visual.text}`}>{visual.label}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.patient.species}
                          {item.patient.breed ? ` • ${item.patient.breed}` : ''} • Tutor: {item.tutor.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Vet: {item.veterinarianName} • Motivo: {item.reason}
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
          <div className="border-b border-slate-200 px-4 py-4 md:px-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Novo agendamento</p>
            <p className="mt-1 text-sm text-slate-700">
              Preencha os campos e registre a consulta do dia.
            </p>
          </div>

          <form className="grid gap-3 px-4 py-4 md:px-6" onSubmit={onCreateAppointment}>
            <select
              required
              value={appointmentForm.patientId}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, patientId: event.target.value }))
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
                  setAppointmentForm((current) => ({ ...current, startsAt: event.target.value }))
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
              />
              <input
                type="time"
                required
                value={appointmentForm.endsAt}
                onChange={(event) =>
                  setAppointmentForm((current) => ({ ...current, endsAt: event.target.value }))
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:ring-teal-400"
              />
            </div>

            <input
              required
              value={appointmentForm.reason}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, reason: event.target.value }))
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resumo rapido</p>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Tutores</dt>
              <dd className="text-right font-medium text-slate-900">{tutors.length}</dd>
              <dt className="text-slate-500">Pacientes</dt>
              <dd className="text-right font-medium text-slate-900">{patients.length}</dd>
              <dt className="text-slate-500">Ativas</dt>
              <dd className="text-right font-medium text-slate-900">{activeAppointments.length}</dd>
            </dl>
          </div>
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
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        danger
          ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
          : 'border-slate-300 text-slate-700 hover:bg-slate-100'
      }`}
    >
      {title}
    </button>
  );
}
