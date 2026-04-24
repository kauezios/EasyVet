import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { UserRole } from '../common/auth/user-role.enum';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';
import { AuditEventsService } from './audit-events.service';

@Controller('audit-events')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditEventsController {
  constructor(private readonly auditEventsService: AuditEventsService) {}

  @Get()
  list(@Query() query: ListAuditEventsQueryDto) {
    return this.auditEventsService.listRecent(query.limit ?? 100);
  }
}
