import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class FinalizeMedicalRecordDto {
  @IsString()
  @MinLength(2)
  @MaxLength(600)
  chiefComplaint!: string;

  @IsString()
  @MaxLength(300)
  symptomsOnset!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2500)
  clinicalHistory!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2500)
  physicalExam!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1200)
  presumptiveDiagnosis!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2500)
  conduct!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2500)
  guidance!: string;

  @IsOptional()
  @IsDateString()
  recommendedReturnAt?: string;
}
