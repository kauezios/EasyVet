"use client";

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
  email: string | null;
  address: string | null;
};

type Patient = {
  id: string;
  tutorId: string;
  name: string;
  species: string;
  breed: string | null;
  sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function Home() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [tutorForm, setTutorForm] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
  });

  const [patientForm, setPatientForm] = useState({
    tutorId: '',
    name: '',
    species: '',
    breed: '',
    sex: 'UNKNOWN',
  });

  const hasTutors = tutors.length > 0;

  const sortedTutors = useMemo(
    () => [...tutors].sort((a, b) => a.name.localeCompare(b.name)),
    [tutors],
  );

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
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
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [tutorData, patientData] = await Promise.all([
        request<Tutor[]>('/tutors'),
        request<Patient[]>('/patients'),
      ]);
      setTutors(tutorData);
      setPatients(patientData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar dados';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onSubmitTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    try {
      const created = await request<Tutor>('/tutors', {
        method: 'POST',
        body: JSON.stringify({
          name: tutorForm.name,
          document: tutorForm.document || undefined,
          phone: tutorForm.phone || undefined,
          email: tutorForm.email || undefined,
        }),
      });

      setTutors((current) => [created, ...current]);
      setPatientForm((current) => ({
        ...current,
        tutorId: current.tutorId || created.id,
      }));
      setTutorForm({ name: '', document: '', phone: '', email: '' });
      setStatusMessage('Tutor criado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar tutor';
      setErrorMessage(message);
    }
  }

  async function onSubmitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    try {
      const created = await request<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify({
          tutorId: patientForm.tutorId,
          name: patientForm.name,
          species: patientForm.species,
          breed: patientForm.breed || undefined,
          sex: patientForm.sex,
        }),
      });

      setPatients((current) => [created, ...current]);
      setPatientForm((current) => ({
        ...current,
        name: '',
        species: '',
        breed: '',
      }));
      setStatusMessage('Paciente criado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar paciente';
      setErrorMessage(message);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="rounded-3xl border border-teal-950/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-teal-800">EasyVet</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Sprint 1: Cadastro de Tutores e Pacientes
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
          Esta tela valida a base operacional do produto com API v1 ativa em{' '}
          <code>{API_BASE}</code>.
        </p>
      </header>

      {(statusMessage || errorMessage) && (
        <section
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {errorMessage || statusMessage}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Novo Tutor</h2>
          <form className="mt-5 grid gap-3" onSubmit={onSubmitTutor}>
            <input
              required
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-teal-400 transition focus:ring-2"
              placeholder="Nome completo"
              value={tutorForm.name}
              onChange={(event) =>
                setTutorForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-teal-400 transition focus:ring-2"
              placeholder="Documento"
              value={tutorForm.document}
              onChange={(event) =>
                setTutorForm((current) => ({ ...current, document: event.target.value }))
              }
            />
            <input
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-teal-400 transition focus:ring-2"
              placeholder="Telefone"
              value={tutorForm.phone}
              onChange={(event) =>
                setTutorForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <input
              type="email"
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-teal-400 transition focus:ring-2"
              placeholder="Email"
              value={tutorForm.email}
              onChange={(event) =>
                setTutorForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <button
              type="submit"
              className="mt-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Salvar Tutor
            </button>
          </form>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Novo Paciente</h2>
          <form className="mt-5 grid gap-3" onSubmit={onSubmitPatient}>
            <select
              required
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring-2"
              value={patientForm.tutorId}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, tutorId: event.target.value }))
              }
              disabled={!hasTutors}
            >
              <option value="">{hasTutors ? 'Selecione o tutor' : 'Cadastre um tutor primeiro'}</option>
              {sortedTutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.name}
                </option>
              ))}
            </select>

            <input
              required
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring-2"
              placeholder="Nome do paciente"
              value={patientForm.name}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, name: event.target.value }))
              }
            />

            <input
              required
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring-2"
              placeholder="Especie"
              value={patientForm.species}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, species: event.target.value }))
              }
            />

            <input
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring-2"
              placeholder="Raça"
              value={patientForm.breed}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, breed: event.target.value }))
              }
            />

            <select
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring-2"
              value={patientForm.sex}
              onChange={(event) =>
                setPatientForm((current) => ({
                  ...current,
                  sex: event.target.value as 'MALE' | 'FEMALE' | 'UNKNOWN',
                }))
              }
            >
              <option value="UNKNOWN">Não informado</option>
              <option value="MALE">Macho</option>
              <option value="FEMALE">Femea</option>
            </select>

            <button
              type="submit"
              className="mt-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              disabled={!hasTutors}
            >
              Salvar Paciente
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Tutores</h3>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
              onClick={() => void loadData()}
              type="button"
            >
              Atualizar
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : tutors.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum tutor cadastrado.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {tutors.map((tutor) => (
                <li key={tutor.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">{tutor.name}</p>
                  <p className="text-slate-600">{tutor.document ?? 'Sem documento'}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Pacientes</h3>

          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : patients.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum paciente cadastrado.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {patients.map((patient) => (
                <li key={patient.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">{patient.name}</p>
                  <p className="text-slate-600">
                    {patient.species}
                    {patient.breed ? ` · ${patient.breed}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}

