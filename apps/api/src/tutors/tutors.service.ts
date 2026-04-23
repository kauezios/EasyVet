import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tutor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTutorDto): Promise<Tutor> {
    try {
      return await this.prisma.tutor.create({
        data: dto,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async list(): Promise<Tutor[]> {
    return this.prisma.tutor.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Tutor> {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!tutor) {
      throw new NotFoundException({
        code: 'TUTOR_NOT_FOUND',
        message: 'Tutor nao encontrado',
      });
    }

    return tutor;
  }

  async update(id: string, dto: UpdateTutorDto): Promise<Tutor> {
    await this.findOne(id);

    try {
      return await this.prisma.tutor.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'TUTOR_DOCUMENT_CONFLICT',
        message: 'Documento ja cadastrado para outro tutor',
      });
    }
  }
}
