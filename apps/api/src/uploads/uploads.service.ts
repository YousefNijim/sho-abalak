import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface UploadedFileDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class UploadsService {
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');

  constructor() {
    // Ensure the public uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: UploadedFileDto): Promise<string> {
    if (!file) {
      throw new BadRequestException('الملف المرفوع غير صالح أو مفقود');
    }

    // Limit allowed extensions to image formats only
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException('نوع الملف غير مدعوم، يرجى رفع صورة فقط (JPG, PNG, WEBP)');
    }

    // Create unique random name to avoid collisions
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueFilename);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
      // Return public URL path
      return `/uploads/${uniqueFilename}`;
    } catch (err) {
      throw new BadRequestException('فشل في حفظ الصورة على خادم الملفات');
    }
  }
}
