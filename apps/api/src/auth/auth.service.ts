import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
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
        role: UserRole.CUSTOMER, // always CUSTOMER — role is not accepted from client
        areaId: dto.areaId ?? null,
      },
    });
    return this.sign(user.id, user.role as UserRole, user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    // No password set yet (e.g. a store still pending admin approval) → treat as invalid creds.
    if (!user || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('رقم الهاتف أو كلمة المرور غير صحيحة');
    }
    if (user.status !== UserStatus.ACTIVE) {
      const message =
        user.status === UserStatus.BANNED
          ? 'تم حظر هذا الحساب'
          : user.status === UserStatus.PENDING
            ? 'حسابك قيد المراجعة من قبل الإدارة'
            : 'تم تعليق هذا الحساب';
      throw new ForbiddenException(message);
    }
    return this.sign(user.id, user.role as UserRole, user);
  }

  /**
   * Self-service store registration from the business login screen.
   * Creates a BUSINESS owner in PENDING status with NO password yet,
   * plus the linked Business, in one transaction. The store cannot log in
   * until an admin approves it and sets a password.
   */
  async registerBusiness(dto: RegisterBusinessDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('رقم الهاتف مسجّل مسبقاً');

    await this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          name: dto.ownerName,
          phone: dto.phone,
          password: null,
          role: UserRole.BUSINESS,
          status: UserStatus.PENDING,
          areaId: dto.areaId,
        },
      });
      await tx.business.create({
        data: {
          ownerId: owner.id,
          name: dto.name,
          type: dto.type,
          areaId: dto.areaId,
          phone: dto.phone,
          addressDetail: dto.addressDetail ?? null,
          ...(dto.tagIds && dto.tagIds.length
            ? { tags: { connect: dto.tagIds.map((id) => ({ id })) } }
            : {}),
        },
      });
    });

    return { submitted: true, status: UserStatus.PENDING };
  }

  /** Authenticated user changes their own password (verifies the current one). */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
    return { changed: true };
  }

  /** Full profile for the authenticated user (includes email/imageUrl the JWT payload omits). */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  /**
   * Update the authenticated user's profile.
   * Changing the phone requires a valid OTP for the NEW number (re-verified here so it
   * cannot be bypassed). Email/phone uniqueness is enforced with a friendly message.
   */
  async updateProfile(
    userId: string,
    dto: { name?: string; email?: string; imageUrl?: string; phone?: string; otpCode?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const data: {
      name?: string;
      email?: string | null;
      imageUrl?: string | null;
      phone?: string;
    } = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl || null;

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase() || null;
      if (email && email !== user.email) {
        const taken = await this.prisma.user.findUnique({ where: { email } });
        if (taken && taken.id !== userId) throw new ConflictException('البريد الإلكتروني مستخدم مسبقاً');
      }
      data.email = email;
    }

    // Phone change — only when it actually differs, and only with a verified OTP.
    if (dto.phone !== undefined && dto.phone !== user.phone) {
      if (!dto.otpCode || !this.verifyOtp(dto.phone, dto.otpCode).verified) {
        throw new BadRequestException('يجب التحقق من رقم الهاتف الجديد عبر رمز التحقق');
      }
      const taken = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (taken && taken.id !== userId) throw new ConflictException('رقم الهاتف مسجّل مسبقاً');
      data.phone = dto.phone;
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return this.publicUser(updated);
  }

  /** Shape a user row for client consumption (never leaks the password hash). */
  private publicUser(user: {
    id: string;
    role: string;
    name: string;
    phone: string;
    email: string | null;
    imageUrl: string | null;
    areaId: string | null;
    status: string;
  }) {
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      imageUrl: user.imageUrl,
      areaId: user.areaId,
      status: user.status,
    };
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
