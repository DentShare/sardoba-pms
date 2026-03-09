import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PushSubscription } from '@/database/entities/push-subscription.entity';

interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: { url?: string; booking_id?: string };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private webpush: any;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    this.initWebPush();
  }

  private initWebPush() {
    try {
      this.webpush = require('web-push');
      const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
      const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

      if (publicKey && privateKey) {
        this.webpush.setVapidDetails(
          'mailto:support@sardoba.uz',
          publicKey,
          privateKey,
        );
        this.logger.log('Web Push VAPID keys configured');
      } else {
        this.logger.warn('VAPID keys not configured — push disabled');
        this.webpush = null;
      }
    } catch {
      this.logger.warn('web-push not installed — push disabled');
      this.webpush = null;
    }
  }

  async subscribe(
    propertyId: number,
    userId: number | null,
    dto: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent: string | null,
  ) {
    const existing = await this.subscriptionRepository.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      existing.propertyId = propertyId;
      existing.userId = userId;
      existing.p256dh = dto.keys.p256dh;
      existing.auth = dto.keys.auth;
      existing.userAgent = userAgent;
      await this.subscriptionRepository.save(existing);
      return { subscribed: true };
    }

    const sub = this.subscriptionRepository.create({
      propertyId,
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent,
    });
    await this.subscriptionRepository.save(sub);
    return { subscribed: true };
  }

  async unsubscribe(endpoint: string) {
    await this.subscriptionRepository.delete({ endpoint });
    return { unsubscribed: true };
  }

  async sendWebPush(propertyId: number, payload: WebPushPayload): Promise<void> {
    if (!this.webpush) return;

    const subscriptions = await this.subscriptionRepository.find({
      where: { propertyId },
    });

    for (const sub of subscriptions) {
      try {
        await this.webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            ...payload,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/icon-72x72.png',
          }),
        );
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await this.subscriptionRepository.delete({ id: sub.id });
          this.logger.log(`Removed stale push subscription: ${sub.id}`);
        } else {
          this.logger.error(`Push failed for ${sub.id}:`, err?.message);
        }
      }
    }
  }

  async sendTestNotification(propertyId: number) {
    await this.sendWebPush(propertyId, {
      title: 'Тест — Sardoba PMS',
      body: 'Push-уведомления работают!',
      tag: 'test',
      data: { url: '/calendar' },
    });
    return { sent: true };
  }
}
