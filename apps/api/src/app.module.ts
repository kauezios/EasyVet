import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TutorsModule } from './tutors/tutors.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    TutorsModule,
    PatientsModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
