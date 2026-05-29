import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async sendPushNotification(
    targetToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<boolean> {
    this.logger.log(
      `[FCM Push Triggered] Token: ${targetToken.slice(0, 15)}... | Title: ${payload.title} | Body: ${payload.body}`,
    );
    // NOTE: To make this live, simply run `pnpm add firebase-admin` and configure:
    // await admin.messaging().send({
    //   token: targetToken,
    //   notification: { title: payload.title, body: payload.body },
    //   data: payload.data
    // });
    return true;
  }
}
