import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedGuard],
  exports: [AuthService, AuthenticatedGuard],
})
export class AuthModule {}
