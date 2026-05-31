import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  /** Extra key/values for deep-linking (e.g. { type: 'order', orderId }). All values stringified. */
  data?: Record<string, string>;
}

/**
 * Sends push notifications via Firebase Cloud Messaging (FCM) and manages device tokens.
 *
 * The service-account credential is loaded from a file whose path comes from
 * `FIREBASE_SERVICE_ACCOUNT_PATH` (default: `./secrets/firebase-service-account.json`,
 * relative to the API process cwd). The secret is never hardcoded. If the file is
 * missing, FCM is treated as DISABLED — token storage and triggers still work, sends
 * are skipped with a warning so the rest of the app is unaffected in dev.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    const credPath = path.resolve(
      process.cwd(),
      process.env['FIREBASE_SERVICE_ACCOUNT_PATH'] ?? './secrets/firebase-service-account.json',
    );

    if (!fs.existsSync(credPath)) {
      this.logger.warn(
        `FCM disabled — service-account key not found at ${credPath}. ` +
          `Set FIREBASE_SERVICE_ACCOUNT_PATH or drop the key file to enable push notifications.`,
      );
      return;
    }

    try {
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log(`FCM initialized (project: ${serviceAccount.project_id ?? 'unknown'})`);
    } catch (err) {
      this.logger.error(`FCM init failed: ${(err as Error).message}`);
      this.app = null;
    }
  }

  /** Whether FCM is configured and ready to send. */
  get enabled(): boolean {
    return this.app !== null;
  }

  /** Upsert a device push token for a user (idempotent on the token). */
  async registerToken(userId: string, token: string, platform?: string, app?: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform: platform ?? null, app: app ?? null },
      update: { userId, platform: platform ?? null, app: app ?? null },
    });
    return { registered: true };
  }

  /** Remove a device token (called on logout). */
  async unregisterToken(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { unregistered: true };
  }

  /**
   * Look up a user's device tokens and send the push to all of them.
   * Additive to socket emits — callers fire both. Never throws: a push failure
   * must not break the originating order/driver flow.
   */
  async send(userId: string, payload: PushPayload): Promise<void> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
      if (tokens.length === 0) {
        this.logger.debug(`No device tokens for user ${userId} — skipping push "${payload.title}"`);
        return;
      }

      if (!this.enabled) {
        this.logger.warn(
          `[FCM disabled] Would send "${payload.title}" to ${tokens.length} token(s) of user ${userId}`,
        );
        return;
      }

      const res = await admin.messaging().sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
      });

      this.logger.log(
        `Push "${payload.title}" → user ${userId}: ${res.successCount} ok, ${res.failureCount} failed`,
      );

      // Prune tokens FCM rejected as unregistered/invalid so we stop sending to dead devices.
      const stale: string[] = [];
      res.responses.forEach((r, i) => {
        const code = r.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          stale.push(tokens[i].token);
        }
      });
      if (stale.length > 0) {
        await this.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
        this.logger.log(`Pruned ${stale.length} stale device token(s)`);
      }
    } catch (err) {
      this.logger.error(`Push send failed for user ${userId}: ${(err as Error).message}`);
    }
  }
}
