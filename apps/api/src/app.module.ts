import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RatesModule } from './modules/rates/rates.module';
import { GuestsModule } from './modules/guests/guests.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChannelModule } from './modules/channel-manager/channel.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { PropertyExtrasModule } from './modules/property-extras/property-extras.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { DynamicPricingModule } from './modules/dynamic-pricing/dynamic-pricing.module';
import { UsersModule } from './modules/users/users.module';
import { GroupBookingsModule } from './modules/group-bookings/group-bookings.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { UploadModule } from './modules/uploads/upload.module';
import { CacheModule } from './modules/cache/cache.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { HolidayCalendarModule } from './modules/holiday-calendar/holiday-calendar.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { InvoicesModule } from './modules/invoices/invoices.module';

/**
 * Conditionally include a module based on an environment variable.
 * Returns the module if the env var is 'true' (or missing), otherwise skips it.
 */
function featureModule(
  envVar: string,
  mod: Type | DynamicModule,
): (Type | DynamicModule)[] {
  const value = process.env[envVar];
  if (value === 'false' || value === '0') {
    return [];
  }
  return [mod];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    EventEmitterModule.forRoot(),

    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: new URL(
            configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
          ).hostname,
          port: parseInt(
            new URL(
              configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
            ).port || '6379',
            10,
          ),
          password: configService.get<string>('REDIS_PASSWORD', ''),
        },
      }),
      inject: [ConfigService],
    }),

    // ── Core modules (always loaded) ─────────────────────────────────────
    DatabaseModule,
    AuthModule,
    RoomsModule,
    RatesModule,
    GuestsModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    PropertyExtrasModule,
    PropertiesModule,
    PublicBookingModule,
    UsersModule,
    HousekeepingModule,
    MessagingModule,
    UploadModule,
    CacheModule,
    AiModule,
    AdminModule,
    PromoCodesModule,
    HolidayCalendarModule,
    ReputationModule,
    ReferralsModule,
    InvoicesModule,

    // ── Feature-flagged modules ──────────────────────────────────────────
    ...featureModule('FEATURE_CHANNEL_MANAGER', ChannelModule),
    ...featureModule('FEATURE_CHANNEL_MANAGER', GroupBookingsModule),
    ...featureModule('FEATURE_ANALYTICS', AnalyticsModule),
    ...featureModule('FEATURE_ONLINE_PAYMENTS', DynamicPricingModule),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
