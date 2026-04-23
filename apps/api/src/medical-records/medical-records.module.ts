import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/auth/roles.guard';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, RolesGuard],
})
export class MedicalRecordsModule {}
