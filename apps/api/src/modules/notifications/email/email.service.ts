import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>('EMAIL_FROM', 'noreply@sardoba.uz');

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetUrl: string,
  ): Promise<boolean> {
    const subject = 'Сброс пароля — Sardoba PMS';
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1A1A2E; font-size: 24px; margin: 0;">Sardoba PMS</h1>
        </div>
        <div style="background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 32px;">
          <h2 style="color: #1A1A2E; font-size: 20px; margin: 0 0 16px;">
            Сброс пароля
          </h2>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
            Здравствуйте, ${userName}!
          </p>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Мы получили запрос на сброс пароля для вашей учётной записи.
            Нажмите кнопку ниже, чтобы установить новый пароль:
          </p>
          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${resetUrl}"
               style="display: inline-block; background: #D4A843; color: #1A1A2E; font-weight: 600;
                      font-size: 16px; padding: 14px 40px; border-radius: 10px; text-decoration: none;">
              Сбросить пароль
            </a>
          </div>
          <p style="color: #9CA3AF; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
            Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
          </p>
          <p style="color: #9CA3AF; font-size: 13px; line-height: 1.6; margin: 0;">
            Ссылка действительна в течение 1 часа.
          </p>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} Sardoba PMS. Все права защищены.
        </p>
      </div>
    `;

    return this.send(to, subject, html);
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const subject = 'Добро пожаловать в Sardoba PMS!';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3002');
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1A1A2E; font-size: 24px; margin: 0;">Sardoba PMS</h1>
        </div>
        <div style="background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 32px;">
          <h2 style="color: #1A1A2E; font-size: 20px; margin: 0 0 16px;">
            Добро пожаловать!
          </h2>
          <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Здравствуйте, ${userName}! Ваш аккаунт в Sardoba PMS успешно создан.
            Начните управлять бронированиями, номерами и гостями прямо сейчас.
          </p>
          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${frontendUrl}/calendar"
               style="display: inline-block; background: #D4A843; color: #1A1A2E; font-weight: 600;
                      font-size: 16px; padding: 14px 40px; border-radius: 10px; text-decoration: none;">
              Открыть панель управления
            </a>
          </div>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} Sardoba PMS. Все права защищены.
        </p>
      </div>
    `;

    return this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[DEV] Email to ${to}: ${subject}`);
      return true;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(
        `Email send error to ${to}`,
        err instanceof Error ? err.stack : err,
      );
      return false;
    }
  }
}
