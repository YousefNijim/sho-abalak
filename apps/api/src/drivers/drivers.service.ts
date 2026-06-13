import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverStatus } from '@shu/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';

import { SocketGateway } from '../gateway/socket.gateway';

// Include the driver's user (name/phone) and area on every read — the apps need them.
const DRIVER_INCLUDE = {
  user: { select: { id: true, name: true, phone: true } },
  area: true,
} satisfies Prisma.DriverInclude;

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
  ) {}

  /** السائق ينشئ ملفه (مرة واحدة فقط لكل مستخدم). */
  async register(userId: string, dto: RegisterDriverDto) {
    const existing = await this.prisma.driver.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('لديك ملف سائق مسجّل بالفعل');

    await this.assertAreaExists(dto.areaId);
    return this.prisma.driver.create({
      data: { userId, areaId: dto.areaId, status: DriverStatus.OFFLINE },
      include: DRIVER_INCLUDE,
    });
  }

  /** ملف السائق الحالي. */
  async findByUser(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: DRIVER_INCLUDE,
    });
    if (!driver) throw new NotFoundException('لا يوجد ملف سائق مرتبط بحسابك');
    return driver;
  }

  /** السائق يبدّل حالته (متاح/مشغول/غير متصل) ويمكنه تغيير منطقته. */
  async updateStatus(userId: string, dto: UpdateDriverStatusDto) {
    const driver = await this.findByUser(userId);
    if (dto.areaId) await this.assertAreaExists(dto.areaId);

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { status: dto.status, ...(dto.areaId ? { areaId: dto.areaId } : {}) },
      include: DRIVER_INCLUDE,
    });

    // Emit driver status change socket event
    this.socketGateway.emitDriverStatusChange(updated.id, updated.status as DriverStatus);

    return updated;
  }

  /** السائق يحدّث ملفه الشخصي (منطقته ونوع مركبته). */
  async updateProfile(userId: string, dto: { areaId?: string, vehicleType?: string }) {
    const driver = await this.findByUser(userId);
    if (dto.areaId) await this.assertAreaExists(dto.areaId);

    return this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        ...(dto.areaId ? { areaId: dto.areaId } : {}),
        ...(dto.vehicleType ? { vehicleType: dto.vehicleType } : {}),
      },
      include: DRIVER_INCLUDE,
    });
  }

  /** تسوية حساب السائق (للوحة الأدمن). */
  async settleAccount(adminId: string, driverId: string, amount?: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('السائق غير موجود');

    const settleAmount = amount ?? Number(driver.platformBalance);
    if (settleAmount <= 0) return driver;

    return this.prisma.$transaction(async (tx) => {
      // Create a settlement record for history
      await tx.driverSettlement.create({
        data: {
          driverId,
          adminId,
          amount: settleAmount,
        },
      });

      // Decrement balance
      return tx.driver.update({
        where: { id: driverId },
        data: { platformBalance: { decrement: settleAmount } },
        include: DRIVER_INCLUDE,
      });
    });
  }

  /** السائقون المتاحون — لشاشة اختيار السائق لدى المنشأة. */
  findAvailable(query: QueryDriversDto) {
    const where: Prisma.DriverWhereInput = { status: DriverStatus.AVAILABLE };
    if (query.areaId) where.areaId = query.areaId;
    if (query.vehicleType) where.vehicleType = query.vehicleType;
    return this.prisma.driver.findMany({
      where,
      include: DRIVER_INCLUDE,
      orderBy: { rating: 'desc' },
    });
  }

  /** كل السائقين — للوحة الأدمن. */
  findAll() {
    return this.prisma.driver.findMany({ include: DRIVER_INCLUDE, orderBy: { rating: 'desc' } });
  }

  async adminUpdate(id: string, dto: UpdateDriverStatusDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('السائق غير موجود');

    if (dto.areaId) await this.assertAreaExists(dto.areaId);

    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.areaId ? { areaId: dto.areaId } : {}),
      },
      include: DRIVER_INCLUDE,
    });

    this.socketGateway.emitDriverStatusChange(updated.id, updated.status as DriverStatus);

    return updated;
  }

  private async assertAreaExists(areaId: string) {
    const area = await this.prisma.area.findUnique({ where: { id: areaId } });
    if (!area) throw new NotFoundException('المنطقة غير موجودة');
  }
}
