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
import { UpdateProfileActiveDto } from './dto/update-profile-active.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { RunInactivityScanDto } from './dto/run-inactivity-scan.dto';
import { UpdateInactivityPolicyDto } from './dto/update-inactivity-policy.dto';
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

  @Get('inactivity-policy')
  inactivityPolicy() {
    return this.profilesService.getInactivityPolicySnapshot();
  }

  @Patch('inactivity-policy')
  updateInactivityPolicy(
    @Body() dto: UpdateInactivityPolicyDto,
    @Req() req: RequestWithAuthUser,
  ) {
    return this.profilesService.updateInactivityPolicy(
      dto,
      req.authUser?.userId,
    );
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

  @Patch(':id/active')
  updateActive(
    @Param('id') id: string,
    @Body() dto: UpdateProfileActiveDto,
    @Req() req: RequestWithAuthUser,
  ) {
    return this.profilesService.updateActive(id, dto, req.authUser?.userId);
  }

  @Post('inactivity-scan')
  runInactivityScan(
    @Body() dto: RunInactivityScanDto,
    @Req() req: RequestWithAuthUser,
  ) {
    return this.profilesService.runInactivityScan(dto, req.authUser?.userId);
  }
}
