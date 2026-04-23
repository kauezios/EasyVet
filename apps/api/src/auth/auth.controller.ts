import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import type { RequestWithAuthUser } from '../common/auth/request-auth-user.type';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  me(@Req() req: RequestWithAuthUser) {
    if (!req.authUser) {
      return null;
    }

    return this.authService.me(req.authUser);
  }
}
