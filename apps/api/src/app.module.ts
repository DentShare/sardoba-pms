import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Global config with validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    // Rate limiting: 100 requests per minute
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Scheduled tasks (cron)
    ScheduleModule.forRoot(),

    // Redis-based Bull queues
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

    // === Other modules are added by respective agents ===
    // TypeOrmModule  — AGENT-02
    AuthModule,       // AGENT-03
    // RoomsModule    — AGENT-04
    // BookingsModule — AGENT-05
    // GuestsModule   — AGENT-06
    // RatesModule    — AGENT-07
    // PaymentsModule — AGENT-08
    // ChannelModule  — AGENT-09
    // NotificationsModule — AGENT-10
    // AnalyticsModule     — AGENT-11
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
