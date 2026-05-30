import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      // Fallback in case seed didn't run
      settings = await this.prisma.systemSettings.create({
        data: {
          id: 'default',
          defaultCommission: 10.0,
          baseDeliveryFee: 3.0,
          customerAppActive: true,
          businessAppActive: true,
          driverAppActive: true,
        },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    // Ensure default settings exist first
    await this.getSettings();

    return this.prisma.systemSettings.update({
      where: { id: 'default' },
      data: dto,
    });
  }
}
