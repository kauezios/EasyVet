import { IsEnum } from 'class-validator';
import { UserRole } from '../../common/auth/user-role.enum';

export class UpdateProfileRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
