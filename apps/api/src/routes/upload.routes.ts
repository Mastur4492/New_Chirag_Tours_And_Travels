import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authenticate } from '../middlewares/authenticate';
import { AppError } from '../utils/appError';
import { isCloudinaryConfigured, uploadToCloudinary } from '../services/cloudinary.service';
import { logger } from '../utils/logger';

const router = Router();

// Uploads directory path for local fallback
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface UploadImageBody {
  image: string; // Base64 data URI or raw base64 string
  filename?: string;
  category?: 'destination' | 'hotel' | 'package' | 'receipt' | 'general';
}

router.post(
  '/image',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { image, filename: originalName, category = 'general' } = req.body as UploadImageBody;

      if (!image || typeof image !== 'string') {
        throw AppError.badRequest('Image data (base64 string) is required.');
      }

      // Check max payload (approx 15MB)
      if (image.length > 20 * 1024 * 1024) {
        throw AppError.badRequest('Image size exceeds maximum allowed limit (15MB).');
      }

      // 1. If Cloudinary is configured, upload to Cloudinary CDN
      if (isCloudinaryConfigured()) {
        try {
          const cResult = await uploadToCloudinary(image, {
            category,
            filename: originalName,
          });

          res.status(201).json({
            success: true,
            data: {
              url: cResult.url,
              relativeUrl: cResult.url,
              provider: 'cloudinary',
              publicId: cResult.publicId,
              format: cResult.format,
              sizeBytes: cResult.sizeBytes,
              uploadedAt: new Date().toISOString(),
            },
          });
          return;
        } catch (cloudErr: any) {
          logger.warn(`Cloudinary upload failed (${cloudErr.message}), falling back to local storage.`);
        }
      }

      // 2. Fallback to local disk storage
      let mimeType = 'image/jpeg';
      let extension = 'jpg';
      let base64Data = image;

      const dataUriMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (dataUriMatch && dataUriMatch[1] && dataUriMatch[2]) {
        mimeType = dataUriMatch[1];
        base64Data = dataUriMatch[2];

        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('svg')) extension = 'svg';
        else extension = 'jpg';
      }

      // Generate secure unique filename
      const randomHash = crypto.randomBytes(6).toString('hex');
      const timestamp = Date.now();
      const sanitizedPrefix = category.replace(/[^a-zA-Z0-9_-]/g, '');
      const uniqueFilename = `${sanitizedPrefix}_${timestamp}_${randomHash}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);

      // Write file to disk
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.promises.writeFile(filePath, buffer);

      const serverUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${serverUrl}/uploads/${uniqueFilename}`;
      const relativeUrl = `/uploads/${uniqueFilename}`;

      res.status(201).json({
        success: true,
        data: {
          url: fileUrl,
          relativeUrl,
          provider: 'local',
          filename: uniqueFilename,
          originalName: originalName || uniqueFilename,
          extension,
          sizeBytes: buffer.length,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export const uploadRouter = router;
