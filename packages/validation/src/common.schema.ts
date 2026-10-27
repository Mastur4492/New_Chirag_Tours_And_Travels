import { z } from 'zod';

export const indianMobileRegex = /^[6-9]\d{9}$/;
export const e164PhoneRegex = /^\+[1-9]\d{6,14}$/;

/**
 * Universal, international-ready phone number validation and normalization schema.
 *
 * Normalization behavior:
 * - Strips whitespace, hyphens, parentheses, and dots.
 * - Handles Indian local inputs: "9876543210", "+91 9876543210", "09876543210" -> "9876543210".
 * - Handles International E.164 inputs: "+1 (415) 555-2671" -> "+14155552671", "+44 7911 123456" -> "+447911123456".
 * - Rejects invalid character sequences, short strings, or non-phone payloads.
 */
export function normalizePhoneNumber(val: string): string {
  // Strip formatting characters: spaces, dashes, dots, parentheses
  const cleaned = val.replace(/[\s\-.()]/g, '');

  // Normalize standard Indian prefixes (+91, 91, 0) for 10-digit mobile numbers
  if (cleaned.startsWith('+91') && indianMobileRegex.test(cleaned.slice(3))) {
    return cleaned.slice(3);
  }
  if (cleaned.startsWith('91') && cleaned.length === 12 && indianMobileRegex.test(cleaned.slice(2))) {
    return cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11 && indianMobileRegex.test(cleaned.slice(1))) {
    return cleaned.slice(1);
  }

  return cleaned;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((val) => normalizePhoneNumber(val))
  .refine(
    (val) => indianMobileRegex.test(val) || e164PhoneRegex.test(val),
    {
      message:
        'Phone number must be a valid 10-digit Indian mobile or an international phone number with country code (E.164 format: e.g. +14155552671)',
    }
  );

/**
 * Backward compatibility alias for phoneSchema.
 * Represents user primary mobile/phone contact.
 */
export const mobileSchema = phoneSchema;

/**
 * Strict domestic Indian 10-digit mobile schema when explicitly required.
 */
export const strictIndianMobileSchema = z
  .string()
  .trim()
  .transform((val) => {
    const cleaned = val.replace(/[\s\-.()]/g, '');
    if (cleaned.startsWith('+91')) return cleaned.slice(3);
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.slice(2);
    if (cleaned.startsWith('0') && cleaned.length === 11) return cleaned.slice(1);
    return cleaned;
  })
  .refine((val) => indianMobileRegex.test(val), {
    message: 'Mobile number must be a valid 10-digit Indian mobile number',
  });

export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address format')
  .toLowerCase();

export const mongoIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: mongoIdSchema,
});

/**
 * Validates image URLs, supporting:
 * - Public CDN/HTTPS URLs (Cloudinary, Unsplash, AWS S3, etc.)
 * - Local static upload paths (e.g. /uploads/image.jpg)
 * - Base64 Data URIs (data:image/...)
 */
export const imageUrlOrPathSchema = z
  .string()
  .trim()
  .max(2000, 'Image URL or path exceeds maximum length of 2000 characters')
  .refine(
    (val) =>
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('/') ||
      val.startsWith('data:image/'),
    {
      message: 'Image must be a valid HTTP(S) URL, local upload path, or base64 data URI',
    }
  );


