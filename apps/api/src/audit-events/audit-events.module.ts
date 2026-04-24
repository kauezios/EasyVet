import { Global, Module } from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { AuditEventsController } from './audit-events.controller';
import { AuditEventsService } from './audit-events.service';

@Global()
@Module({
  controllers: [AuditEventsController],
  providers: [AuditEventsService, AuthenticatedGuard, RolesGuard],
  exports: [AuditEventsService],
})
export class AuditEventsModule {}
