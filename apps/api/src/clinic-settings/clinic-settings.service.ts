import { ClinicScheduleSettings } from '@prisma/client';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClinicScheduleSettingsDto } from './dto/update-clinic-schedule-settings.dto';

const DEFAULT_SCHEDULE_SETTINGS_ID = 'default';

export type ClinicScheduleSettingsOutput = {
  consultationDurationMinutes: number;
  openingTime: string;
  closingTime: string;
};

@Injectable()
export class ClinicSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchedule(): Promise<ClinicScheduleSettingsOutput> {
    const settings = await this.getOrCreateDefaultSettings();
    return this.toOutput(settings);
  }

  async updateSchedule(
    dto: UpdateClinicScheduleSettingsDto,
  ): Promise<ClinicScheduleSettingsOutput> {
    const current = await this.getOrCreateDefaultSettings();

    const next = {
      consultationDurationMinutes:
        dto.consultationDurationMinutes ?? current.consultationDurationMinutes,
      openingTime: dto.openingTime ?? current.openingTime,
      closingTime: dto.closingTime ?? current.closingTime,
    };

    this.validateSchedule(next);

    const updated = await this.prisma.clinicScheduleSettings.update({
      where: {
        id: DEFAULT_SCHEDULE_SETTINGS_ID,
      },
      data: next,
    });

    return this.toOutput(updated);
  }

  private async getOrCreateDefaultSettings(): Promise<ClinicScheduleSettings> {
    return this.prisma.clinicScheduleSettings.upsert({
      where: {
        id: DEFAULT_SCHEDULE_SETTINGS_ID,
      },
      update: {},
      create: {
        id: DEFAULT_SCHEDULE_SETTINGS_ID,
        consultationDurationMinutes: 30,
        openingTime: '08:00',
        closingTime: '18:00',
      },
    });
  }

  private validateSchedule(settings: ClinicScheduleSettingsOutput): void {
    const openingMinutes = this.toMinutes(settings.openingTime);
    const closingMinutes = this.toMinutes(settings.closingTime);

    if (
      Number.isNaN(openingMinutes) ||
      Number.isNaN(closingMinutes) ||
      openingMinutes < 0 ||
      closingMinutes < 0
    ) {
      throw new UnprocessableEntityException({
        code: 'CLINIC_SCHEDULE_INVALID_TIME',
        message: 'Horario de expediente invalido',
      });
    }

    if (openingMinutes >= closingMinutes) {
      throw new UnprocessableEntityException({
        code: 'CLINIC_SCHEDULE_INVALID_RANGE',
        message: 'Horario de inicio deve ser menor que o horario de termino',
      });
    }

    if (
      closingMinutes - openingMinutes <
      settings.consultationDurationMinutes
    ) {
      throw new UnprocessableEntityException({
        code: 'CLINIC_SCHEDULE_DURATION_EXCEEDS_WINDOW',
        message: 'Duracao da consulta excede a janela de expediente',
      });
    }
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private toOutput(
    settings: ClinicScheduleSettings,
  ): ClinicScheduleSettingsOutput {
    return {
      consultationDurationMinutes: settings.consultationDurationMinutes,
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
    };
  }
}
