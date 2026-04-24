import { AuditEvent } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RegisterAuditEventInput = {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  summary?: string | null;
};

@Injectable()
export class AuditEventsService {
  private readonly logger = new Logger(AuditEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterAuditEventInput): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          actorId: input.actorId ?? null,
          entity: input.entity,
          entityId: input.entityId,
          action: input.action,
          summary: input.summary ?? null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erro inesperado ao persistir';
      this.logger.warn(`Falha ao registrar evento de auditoria: ${message}`);
    }
  }

  async listRecent(limit: number): Promise<AuditEvent[]> {
    return this.prisma.auditEvent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }
}
