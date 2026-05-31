import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto, UnregisterTokenDto } from './dto/register-token.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** تسجيل رمز جهاز المستخدم لاستقبال الإشعارات. */
  @Post('register-token')
  registerToken(@CurrentUser() user: AuthUser, @Body() dto: RegisterTokenDto) {
    return this.notifications.registerToken(user.id, dto.token, dto.platform, dto.app);
  }

  /** إزالة رمز الجهاز (عند تسجيل الخروج). */
  @Delete('token')
  unregisterToken(@Body() dto: UnregisterTokenDto) {
    return this.notifications.unregisterToken(dto.token);
  }
}
