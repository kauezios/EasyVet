import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PatientSex } from '@prisma/client';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  tutorId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  breed?: string;

  @IsOptional()
  @IsEnum(PatientSex)
  sex?: PatientSex;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentWeight?: number;
}
