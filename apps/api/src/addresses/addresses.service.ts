import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AuthUser } from '../auth/jwt.strategy';

const INCLUDE = { area: { select: { id: true, city: true, name: true } } } as const;

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthUser) {
    return this.prisma.savedAddress.findMany({
      where: { userId: user.id },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  create(user: AuthUser, dto: CreateAddressDto) {
    return this.prisma.savedAddress.create({
      data: { userId: user.id, label: dto.label, detail: dto.detail, areaId: dto.areaId ?? null },
      include: INCLUDE,
    });
  }

  async update(id: string, user: AuthUser, dto: UpdateAddressDto) {
    await this.assertOwner(id, user);
    return this.prisma.savedAddress.update({
      where: { id },
      data: { label: dto.label, detail: dto.detail, areaId: dto.areaId ?? undefined },
      include: INCLUDE,
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.assertOwner(id, user);
    await this.prisma.savedAddress.delete({ where: { id } });
    return { message: 'تم حذف العنوان' };
  }

  private async assertOwner(id: string, user: AuthUser) {
    const addr = await this.prisma.savedAddress.findUnique({ where: { id } });
    if (!addr) throw new NotFoundException('العنوان غير موجود');
    if (addr.userId !== user.id) throw new ForbiddenException();
  }
}
