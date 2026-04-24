import { IsBoolean } from 'class-validator';

export class UpdateProfileActiveDto {
  @IsBoolean()
  active!: boolean;
}
