import { Injectable, Logger } from '@nestjs/common';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
];

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      this.logger.log(`Created uploads directory: ${UPLOAD_DIR}`);
    }
  }

  /**
   * Save an uploaded image file and return its public URL path.
   */
  saveImage(file: Express.Multer.File): string {
    this.validateFile(file, ALLOWED_IMAGE_TYPES);
    return this.saveFile(file);
  }

  /**
   * Save an uploaded document file (images + PDF) and return its public URL path.
   */
  saveDocument(file: Express.Multer.File): string {
    this.validateFile(file, ALLOWED_DOCUMENT_TYPES);
    return this.saveFile(file);
  }

  /**
   * Delete a file by its URL path.
   */
  deleteFile(urlPath: string): void {
    // urlPath is like "/uploads/1234567890-photo.jpg"
    const filename = path.basename(urlPath);
    const filePath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted file: ${filePath}`);
    }
  }

  private validateFile(
    file: Express.Multer.File,
    allowedTypes: string[],
  ): void {
    if (!file) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { file: 'File is required' },
        'No file provided',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { file: 'File too large', max_size: '5MB' },
        'File size exceeds 5MB limit',
      );
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { file: 'Invalid file type', allowed: allowedTypes },
        `File type ${file.mimetype} is not allowed`,
      );
    }
  }

  private saveFile(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    fs.writeFileSync(filePath, file.buffer);
    this.logger.log(`Saved file: ${filePath} (${file.size} bytes)`);

    return `/uploads/${safeName}`;
  }
}
