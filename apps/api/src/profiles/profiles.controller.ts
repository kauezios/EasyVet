import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import type { RequestWithAuthUser } from '../common/auth/request-auth-user.type';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { UserRole } from '../common/auth/user-role.enum';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileRoleDto } from './dto/update-profile-role.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  list() {
    return this.profilesService.list();
  }

  @Post()
  create(@Body() dto: CreateProfileDto, @Req() req: RequestWithAuthUser) {
    return this.profilesService.create(dto, req.authUser?.userId);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateProfileRoleDto,
    @Req() req: RequestWithAuthUser,
  ) {
    return this.profilesService.updateRole(id, dto, req.authUser?.userId);
  }
}
