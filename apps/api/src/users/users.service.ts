import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserStatus } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';

// Never expose the password hash. Everything the admin UI needs, nothing more.
const PUBLIC_USER_SELECT = {
  id: true,
  role: true,
  status: true,
  name: true,
  phone: true,
  email: true,
  areaId: true,
  createdAt: true,
  business: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    // Guard against locking out admins via this endpoint.
    if (user.role === 'ADMIN') throw new ForbiddenException('لا يمكن تغيير حالة حساب مشرف');

    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: PUBLIC_USER_SELECT,
    });
  }
}
