import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePatientDto): Promise<Patient> {
    await this.ensureTutorExists(dto.tutorId);

    return this.prisma.patient.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      },
    });
  }

  async list(): Promise<Patient[]> {
    return this.prisma.patient.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new NotFoundException({
        code: 'PATIENT_NOT_FOUND',
        message: 'Paciente nao encontrado',
      });
    }

    return patient;
  }

  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    await this.findOne(id);

    if (dto.tutorId) {
      await this.ensureTutorExists(dto.tutorId);
    }

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  private async ensureTutorExists(tutorId: string): Promise<void> {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id: tutorId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!tutor) {
      throw new UnprocessableEntityException({
        code: 'PATIENT_TUTOR_NOT_FOUND',
        message: 'Tutor informado nao existe ou esta inativo',
      });
    }
  }
}
