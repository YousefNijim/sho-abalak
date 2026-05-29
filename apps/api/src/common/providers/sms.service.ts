import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(phone: string, message: string): Promise<boolean> {
    this.logger.log(`[Twilio SMS Dispatch Triggered] To: ${phone} | Content: ${message}`);
    // NOTE: To make this live, simply run `pnpm add twilio` and configure:
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({ body: message, to: phone, from: fromPhone });
    return true;
  }
}
