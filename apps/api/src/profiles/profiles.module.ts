import { Module } from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService, RolesGuard, AuthenticatedGuard],
})
export class ProfilesModule {}
