import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { UserRole } from '../common/auth/user-role.enum';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileRoleDto } from './dto/update-profile-role.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  list() {
    return this.profilesService.list();
  }

  @Post()
  create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateProfileRoleDto) {
    return this.profilesService.updateRole(id, dto);
  }
}
