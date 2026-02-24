import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  APP_URL: Joi.string().uri().default('http://localhost:3001'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Database (AGENT-02)
  DATABASE_URL: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DATABASE_POOL_MIN: Joi.number().integer().min(1).default(2),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).default(10),

  // Redis (AGENT-01)
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // JWT (AGENT-03)
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().default('test-jwt-secret-minimum-32-characters!!'),
    otherwise: Joi.required(),
  }),
  JWT_EXPIRES_IN: Joi.number().integer().default(86400),
  JWT_REFRESH_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().default('test-jwt-refresh-secret-min-32-chars!!'),
    otherwise: Joi.required(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.number().integer().default(604800),

  // Encryption (AGENT-06)
  ENCRYPTION_KEY: Joi.string().allow('').default(''),

  // Cloudinary (AGENT-04)
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  // Telegram (AGENT-10)
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').default(''),
  TELEGRAM_BOT_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  // Payme (AGENT-08)
  PAYME_MERCHANT_ID: Joi.string().allow('').default(''),
  PAYME_SECRET_KEY: Joi.string().allow('').default(''),
  PAYME_CHECKOUT_URL: Joi.string().uri().default('https://checkout.paycom.uz'),

  // Click (AGENT-08)
  CLICK_MERCHANT_ID: Joi.string().allow('').default(''),
  CLICK_SERVICE_ID: Joi.string().allow('').default(''),
  CLICK_SECRET_KEY: Joi.string().allow('').default(''),

  // Booking.com (AGENT-09)
  BOOKING_API_KEY: Joi.string().allow('').default(''),
  BOOKING_HOTEL_ID: Joi.string().allow('').default(''),
  BOOKING_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  // Sentry (AGENT-01)
  SENTRY_DSN: Joi.string().allow('').default(''),

  // Email - Resend
  RESEND_API_KEY: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().email().default('noreply@sardoba.uz'),

  // WhatsApp Business
  WHATSAPP_API_URL: Joi.string().uri().default('https://graph.facebook.com/v18.0'),
  WHATSAPP_TOKEN: Joi.string().allow('').default(''),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().allow('').default(''),

  // Feature flags
  FEATURE_CHANNEL_MANAGER: Joi.boolean().default(true),
  FEATURE_ONLINE_PAYMENTS: Joi.boolean().default(true),
  FEATURE_ANALYTICS: Joi.boolean().default(true),
});
