import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Check if credentials exist
export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL || env.CLOUDINARY_URL) {
    return true;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET;

  return Boolean(cloudName && apiKey && apiSecret);
}

// Initialize Cloudinary instance if credentials exist
let initialized = false;
function initCloudinary(): boolean {
  if (initialized) return true;
  if (!isCloudinaryConfigured()) return false;

  try {
    const cloudinaryUrl = process.env.CLOUDINARY_URL || env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      cloudinary.config();
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
    initialized = true;
    logger.info('☁️ Cloudinary SDK successfully configured for media storage.');
    return true;
  } catch (err) {
    logger.error('Failed to initialize Cloudinary:', err);
    return false;
  }
}

export interface CloudinaryUploadOptions {
  folder?: string;
  category?: 'destination' | 'hotel' | 'package' | 'receipt' | 'general';
  filename?: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  sizeBytes: number;
}

/**
 * Uploads a base64 or remote image to Cloudinary CDN
 */
export async function uploadToCloudinary(
  imageSource: string,
  options: CloudinaryUploadOptions = {}
): Promise<UploadResult> {
  const ready = initCloudinary();
  if (!ready) {
    throw new Error('Cloudinary is not configured in environment variables');
  }

  const category = options.category || 'general';
  const folder = options.folder || `chirag_travels/${category}`;

  const res: UploadApiResponse = await cloudinary.uploader.upload(imageSource, {
    folder,
    resource_type: 'image',
    fetch_format: 'auto',
    quality: 'auto',
    use_filename: Boolean(options.filename),
    unique_filename: true,
    overwrite: false,
  });

  return {
    url: res.secure_url,
    publicId: res.public_id,
    format: res.format,
    width: res.width,
    height: res.height,
    sizeBytes: res.bytes,
  };
}
