import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('رقم الهاتف مسجّل مسبقاً');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        password: passwordHash,
        role: dto.role ?? UserRole.CUSTOMER,
        areaId: dto.areaId ?? null,
      },
    });
    return this.sign(user.id, user.role as UserRole, user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('رقم الهاتف أو كلمة المرور غير صحيحة');
    }
    return this.sign(user.id, user.role as UserRole, user);
  }

  private sign(id: string, role: UserRole, user: { name: string; phone: string }) {
    const payload: JwtPayload = { sub: id, role };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id, role, name: user.name, phone: user.phone },
    };
  }

  /**
   * OTP stub — phone verification (FRONTEND_DESIGN.md customer screen 5).
   * No SMS provider wired yet; returns a fixed dev code so the flow is testable.
   */
  requestOtp(phone: string) {
    return { phone, sent: true, devCode: '0000' };
  }

  verifyOtp(phone: string, code: string) {
    return { phone, verified: code === '0000' };
  }
}
