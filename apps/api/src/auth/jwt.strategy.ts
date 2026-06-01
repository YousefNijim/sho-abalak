import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole, UserStatus } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { requireJwtSecret } from './jwt-secret';

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    // Reject tokens of suspended/banned users (revokes access without waiting for expiry).
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('الحساب غير نشط');
    return { id: user.id, role: user.role as UserRole, name: user.name, phone: user.phone };
  }
}
