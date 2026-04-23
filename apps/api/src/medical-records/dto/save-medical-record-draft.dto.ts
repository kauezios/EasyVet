import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SaveMedicalRecordDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(600)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  symptomsOnset?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  clinicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  physicalExam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  presumptiveDiagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  conduct?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  guidance?: string;

  @IsOptional()
  @IsDateString()
  recommendedReturnAt?: string;
}
