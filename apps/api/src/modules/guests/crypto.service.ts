import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption service for sensitive guest data (passport numbers).
 *
 * Storage format (hex string):
 *   iv (12 bytes / 24 hex) + authTag (16 bytes / 32 hex) + ciphertext (variable)
 *
 * Environment:
 *   ENCRYPTION_KEY — 32-byte key as 64-char hex string
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const hexKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Returns hex string: iv (24 hex) + authTag (32 hex) + ciphertext (variable hex).
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // iv (12 bytes) + authTag (16 bytes) + ciphertext
    return Buffer.concat([iv, authTag, encrypted]).toString('hex');
  }

  /**
   * Decrypt hex string produced by encrypt().
   * Expects: iv (12 bytes) + authTag (16 bytes) + ciphertext.
   */
  decrypt(hex: string): string {
    const data = Buffer.from(hex, 'hex');

    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
