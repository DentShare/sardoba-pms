import { Injectable, Logger } from '@nestjs/common';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { AiService } from './ai.service';

export interface PassportOcrData {
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birth_date: string | null;
  passport_number: string | null;
  nationality: string | null;
  expiry_date: string | null;
  gender: string | null;
}

export interface PassportOcrResult {
  confidence: number;
  data: PassportOcrData;
}

@Injectable()
export class PassportOcrService {
  private readonly logger = new Logger(PassportOcrService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Extract passport data from an image using Claude Vision API.
   * Throws SERVICE_UNAVAILABLE if AI is not configured.
   */
  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<PassportOcrResult> {
    if (!this.aiService.isConfigured) {
      throw new SardobaException(
        ErrorCode.AI_SERVICE_UNAVAILABLE,
        { reason: 'ANTHROPIC_API_KEY not configured' },
        'AI service unavailable. Passport OCR requires a configured Anthropic API key.',
      );
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { mime_type: mimeType, allowed: allowedTypes },
        `Unsupported image type: ${mimeType}. Use JPEG, PNG, WebP, or GIF.`,
      );
    }

    const base64 = imageBuffer.toString('base64');

    const systemPrompt = `Ты OCR система для паспортов и удостоверений личности. Извлеки данные из изображения документа и верни ТОЛЬКО JSON без пояснений.

Обязательные поля в JSON:
- last_name (фамилия, string или null)
- first_name (имя, string или null)
- middle_name (отчество, string или null)
- birth_date (дата рождения в формате YYYY-MM-DD, string или null)
- passport_number (номер документа, string или null)
- nationality (гражданство, ISO 3166-1 alpha-2 код: UZ, RU, KZ и т.д., string или null)
- expiry_date (дата окончания действия в формате YYYY-MM-DD, string или null)
- gender (пол: "M" или "F", string или null)

Если поле не видно или нечитаемо — поставь null.
Верни ТОЛЬКО JSON объект, без markdown, без пояснений.`;

    try {
      const aiResponse = await this.aiService.sendVisionMessage({
        system: systemPrompt,
        imageBase64: base64,
        mediaType: mimeType,
        userMessage: 'Извлеки данные из этого документа (паспорта или удостоверения личности).',
        maxTokens: 512,
      });

      // Parse JSON response, strip markdown code blocks if present
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(cleaned);

      return {
        confidence: 0.85, // Claude doesn't return confidence, use fixed value
        data: {
          last_name: this.normalizeField(data.last_name),
          first_name: this.normalizeField(data.first_name),
          middle_name: this.normalizeField(data.middle_name),
          birth_date: this.normalizeDate(data.birth_date),
          passport_number: this.normalizeField(data.passport_number),
          nationality: this.normalizeNationality(data.nationality),
          expiry_date: this.normalizeDate(data.expiry_date),
          gender: this.normalizeGender(data.gender),
        },
      };
    } catch (error) {
      // If it's already a SardobaException, re-throw
      if (error instanceof SardobaException) {
        throw error;
      }

      this.logger.error(`Passport OCR failed: ${error}`);
      throw new SardobaException(
        ErrorCode.AI_SERVICE_UNAVAILABLE,
        { reason: 'OCR processing failed' },
        'Failed to extract passport data. Please try again or enter data manually.',
      );
    }
  }

  /**
   * Normalize a string field: trim whitespace, return null if empty.
   */
  private normalizeField(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
  }

  /**
   * Normalize a date field to YYYY-MM-DD format. Returns null if invalid.
   */
  private normalizeDate(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();

    // Validate YYYY-MM-DD format
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match.map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return null;
    }

    return str;
  }

  /**
   * Normalize nationality to uppercase ISO 3166-1 alpha-2 code.
   */
  private normalizeNationality(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim().toUpperCase();
    // Must be 2 letters
    return /^[A-Z]{2}$/.test(str) ? str : null;
  }

  /**
   * Normalize gender to M or F.
   */
  private normalizeGender(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim().toUpperCase();
    if (str === 'M' || str === 'MALE') return 'M';
    if (str === 'F' || str === 'FEMALE') return 'F';
    return null;
  }
}
