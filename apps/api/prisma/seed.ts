import {
  AccessRole,
  AppointmentStatus,
  MedicalRecordStatus,
  PatientSex,
  PrismaClient,
} from '@prisma/client';
import { createPasswordHash } from '../src/common/auth/password.util';

const prisma = new PrismaClient();

function buildUtcDate(baseDate: string, time: string): Date {
  return new Date(`${baseDate}T${time}:00.000Z`);
}

async function main() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const passwordHash = createPasswordHash('easyvet123');

  await prisma.clinicScheduleSettings.upsert({
    where: { id: 'default' },
    update: {
      consultationDurationMinutes: 30,
      openingTime: '08:00',
      closingTime: '18:00',
    },
    create: {
      id: 'default',
      consultationDurationMinutes: 30,
      openingTime: '08:00',
      closingTime: '18:00',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@easyvet.local' },
    update: {
      name: 'Administrador EasyVet',
      passwordHash,
      role: AccessRole.ADMIN,
      active: true,
    },
    create: {
      name: 'Administrador EasyVet',
      email: 'admin@easyvet.local',
      passwordHash,
      role: AccessRole.ADMIN,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'vet@easyvet.local' },
    update: {
      name: 'Veterinario EasyVet',
      passwordHash,
      role: AccessRole.VETERINARIAN,
      active: true,
    },
    create: {
      name: 'Veterinario EasyVet',
      email: 'vet@easyvet.local',
      passwordHash,
      role: AccessRole.VETERINARIAN,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'recepcao@easyvet.local' },
    update: {
      name: 'Recepcao EasyVet',
      passwordHash,
      role: AccessRole.RECEPTION,
      active: true,
    },
    create: {
      name: 'Recepcao EasyVet',
      email: 'recepcao@easyvet.local',
      passwordHash,
      role: AccessRole.RECEPTION,
      active: true,
    },
  });

  const tutorOne = await prisma.tutor.upsert({
    where: { id: 'seed-tutor-1' },
    update: {
      name: 'Marina Araujo',
      document: '111.222.333-44',
      phone: '(11) 99999-1001',
      email: 'marina@easyvet.local',
      address: 'Rua das Acacias, 120',
    },
    create: {
      id: 'seed-tutor-1',
      name: 'Marina Araujo',
      document: '111.222.333-44',
      phone: '(11) 99999-1001',
      email: 'marina@easyvet.local',
      address: 'Rua das Acacias, 120',
    },
  });

  const tutorTwo = await prisma.tutor.upsert({
    where: { id: 'seed-tutor-2' },
    update: {
      name: 'Carlos Mendes',
      document: '555.666.777-88',
      phone: '(11) 98888-2202',
      email: 'carlos@easyvet.local',
      address: 'Alameda Aurora, 59',
    },
    create: {
      id: 'seed-tutor-2',
      name: 'Carlos Mendes',
      document: '555.666.777-88',
      phone: '(11) 98888-2202',
      email: 'carlos@easyvet.local',
      address: 'Alameda Aurora, 59',
    },
  });

  const patientOne = await prisma.patient.upsert({
    where: { id: 'seed-patient-1' },
    update: {
      tutorId: tutorOne.id,
      name: 'Thor',
      species: 'Canino',
      breed: 'Labrador',
      sex: PatientSex.MALE,
      currentWeight: 28.4,
    },
    create: {
      id: 'seed-patient-1',
      tutorId: tutorOne.id,
      name: 'Thor',
      species: 'Canino',
      breed: 'Labrador',
      sex: PatientSex.MALE,
      currentWeight: 28.4,
    },
  });

  const patientTwo = await prisma.patient.upsert({
    where: { id: 'seed-patient-2' },
    update: {
      tutorId: tutorTwo.id,
      name: 'Mia',
      species: 'Felino',
      breed: 'Siames',
      sex: PatientSex.FEMALE,
      currentWeight: 4.1,
    },
    create: {
      id: 'seed-patient-2',
      tutorId: tutorTwo.id,
      name: 'Mia',
      species: 'Felino',
      breed: 'Siames',
      sex: PatientSex.FEMALE,
      currentWeight: 4.1,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appointment-1' },
    update: {
      tutorId: tutorOne.id,
      patientId: patientOne.id,
      veterinarianName: 'Dra. Camila Souza',
      startsAt: buildUtcDate(dateKey, '09:00'),
      endsAt: buildUtcDate(dateKey, '09:30'),
      reason: 'Consulta de rotina',
      status: AppointmentStatus.IN_PROGRESS,
      notes: null,
      canceledAt: null,
    },
    create: {
      id: 'seed-appointment-1',
      tutorId: tutorOne.id,
      patientId: patientOne.id,
      veterinarianName: 'Dra. Camila Souza',
      startsAt: buildUtcDate(dateKey, '09:00'),
      endsAt: buildUtcDate(dateKey, '09:30'),
      reason: 'Consulta de rotina',
      status: AppointmentStatus.IN_PROGRESS,
      notes: null,
      canceledAt: null,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appointment-2' },
    update: {
      tutorId: tutorTwo.id,
      patientId: patientTwo.id,
      veterinarianName: 'Dr. Rafael Lima',
      startsAt: buildUtcDate(dateKey, '10:00'),
      endsAt: buildUtcDate(dateKey, '10:30'),
      reason: 'Retorno dermatologico',
      status: AppointmentStatus.SCHEDULED,
      notes: null,
      canceledAt: null,
    },
    create: {
      id: 'seed-appointment-2',
      tutorId: tutorTwo.id,
      patientId: patientTwo.id,
      veterinarianName: 'Dr. Rafael Lima',
      startsAt: buildUtcDate(dateKey, '10:00'),
      endsAt: buildUtcDate(dateKey, '10:30'),
      reason: 'Retorno dermatologico',
      status: AppointmentStatus.SCHEDULED,
      notes: null,
      canceledAt: null,
    },
  });

  await prisma.medicalRecord.upsert({
    where: {
      appointmentId: 'seed-appointment-1',
    },
    update: {
      status: MedicalRecordStatus.DRAFT,
      chiefComplaint: 'Prurido em regiao cervical',
      symptomsOnset: 'Ha 3 dias',
      clinicalHistory: 'Paciente ativo, sem alteracao de apetite.',
      physicalExam: null,
      presumptiveDiagnosis: null,
      conduct: null,
      guidance: null,
      recommendedReturnAt: null,
      finalizedAt: null,
    },
    create: {
      appointmentId: 'seed-appointment-1',
      status: MedicalRecordStatus.DRAFT,
      chiefComplaint: 'Prurido em regiao cervical',
      symptomsOnset: 'Ha 3 dias',
      clinicalHistory: 'Paciente ativo, sem alteracao de apetite.',
      physicalExam: null,
      presumptiveDiagnosis: null,
      conduct: null,
      guidance: null,
      recommendedReturnAt: null,
      finalizedAt: null,
    },
  });

  console.log('Seed concluido com sucesso.');
}

main()
  .catch((error) => {
    console.error('Falha ao executar seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
