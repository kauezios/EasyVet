import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TutorsModule } from './tutors/tutors.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthModule } from './auth/auth.module';
import { ClinicSettingsModule } from './clinic-settings/clinic-settings.module';
import { AuditEventsModule } from './audit-events/audit-events.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    TutorsModule,
    PatientsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    ProfilesModule,
    AuthModule,
    ClinicSettingsModule,
    AuditEventsModule,
  ],
})
export class AppModule {}
