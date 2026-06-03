import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
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
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
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

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'sho_abalak_uploads',
          // Optionally you can automatically format and optimize all uploads
          // format: 'webp',
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadRequestException('فشل في رفع الصورة إلى خوادم التخزين سحابياً'));
          } else {
            resolve(result.secure_url);
          }
        },
      );

      // Create a readable stream from the buffer and pipe it to Cloudinary
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }
}
