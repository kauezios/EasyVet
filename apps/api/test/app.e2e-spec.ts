import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureHttpApp } from '../src/common/http/configure-http-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { createInMemoryPrisma } from './support/in-memory-prisma';

type ApiEnvelope<T> = {
  data: T;
  meta: {
    correlationId: string;
  };
};

type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
  meta: {
    correlationId: string;
  };
};

describe('Main flow (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: ReturnType<typeof createInMemoryPrisma>;

  beforeAll(async () => {
    prismaMock = createInMemoryPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttpApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-correlation-id', 'health-e2e')
      .expect(200);

    const payload = response.body as ApiEnvelope<{ status: string }>;

    expect(payload.data.status).toBe('ok');
    expect(payload.meta.correlationId).toBe('health-e2e');
  });

  it('executa fluxo cadastro -> agenda -> prontuario com RBAC', async () => {
    const tutorResponse = await request(app.getHttpServer())
      .post('/api/v1/tutors')
      .send({
        name: 'Marina Araujo',
        document: '111.222.333-44',
        phone: '(11) 99999-1000',
        email: 'marina@easyvet.local',
      })
      .expect(201);

    const tutorPayload = tutorResponse.body as ApiEnvelope<{ id: string }>;
    const tutorId = tutorPayload.data.id;
    expect(tutorId).toBeDefined();

    const patientResponse = await request(app.getHttpServer())
      .post('/api/v1/patients')
      .send({
        tutorId,
        name: 'Thor',
        species: 'Canino',
        breed: 'Labrador',
        sex: 'MALE',
      })
      .expect(201);

    const patientPayload = patientResponse.body as ApiEnvelope<{ id: string }>;
    const patientId = patientPayload.data.id;
    expect(patientId).toBeDefined();

    const appointmentResponse = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        patientId,
        veterinarianName: 'Dra. Camila Souza',
        startsAt: '2026-04-23T09:00:00.000Z',
        endsAt: '2026-04-23T09:30:00.000Z',
        reason: 'Consulta de rotina',
      })
      .expect(201);

    const appointmentPayload = appointmentResponse.body as ApiEnvelope<{
      id: string;
    }>;
    const appointmentId = appointmentPayload.data.id;
    expect(appointmentId).toBeDefined();

    const startRecordResponse = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentId}/medical-record/start`)
      .expect(201);

    const startRecordPayload = startRecordResponse.body as ApiEnvelope<{
      status: string;
    }>;
    expect(startRecordPayload.data.status).toBe('DRAFT');

    const draftPayload = {
      chiefComplaint: 'Prurido em regiao cervical',
      symptomsOnset: 'Ha 3 dias',
      clinicalHistory: 'Paciente ativo, sem alteracao de apetite.',
      physicalExam: 'Sem febre, leve eritema localizado.',
      presumptiveDiagnosis: 'Dermatite alergica',
      conduct: 'Iniciar terapia topica por 7 dias.',
      guidance: 'Retornar se houver piora em 48 horas.',
      recommendedReturnAt: '2026-05-05',
    };

    const draftResponse = await request(app.getHttpServer())
      .put(`/api/v1/appointments/${appointmentId}/medical-record/draft`)
      .send(draftPayload)
      .expect(200);

    const draftApiPayload = draftResponse.body as ApiEnvelope<{
      status: string;
      chiefComplaint: string;
    }>;
    expect(draftApiPayload.data.status).toBe('DRAFT');
    expect(draftApiPayload.data.chiefComplaint).toBe(
      draftPayload.chiefComplaint,
    );

    const forbiddenFinalizeResponse = await request(app.getHttpServer())
      .put(`/api/v1/appointments/${appointmentId}/medical-record/finalize`)
      .set('x-user-role', 'RECEPTION')
      .send(draftPayload)
      .expect(403);

    const forbiddenPayload = forbiddenFinalizeResponse.body as ApiErrorEnvelope;
    expect(forbiddenPayload.error.code).toBe('ROLE_NOT_ALLOWED');

    const finalizeResponse = await request(app.getHttpServer())
      .put(`/api/v1/appointments/${appointmentId}/medical-record/finalize`)
      .set('x-user-role', 'VETERINARIAN')
      .send(draftPayload)
      .expect(200);

    const finalizePayload = finalizeResponse.body as ApiEnvelope<{
      status: string;
      finalizedAt: string | null;
    }>;
    expect(finalizePayload.data.status).toBe('FINALIZED');
    expect(finalizePayload.data.finalizedAt).toBeTruthy();

    const appointmentAfterFinalize = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${appointmentId}`)
      .expect(200);

    const appointmentAfterPayload =
      appointmentAfterFinalize.body as ApiEnvelope<{
        status: string;
      }>;
    expect(appointmentAfterPayload.data.status).toBe('COMPLETED');
  });
});
