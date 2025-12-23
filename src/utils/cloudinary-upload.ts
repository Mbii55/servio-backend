// src/utils/cloudinary-upload.ts
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

interface UploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
}

/**
 * Upload image buffer to Cloudinary
 * @param buffer - File buffer from multer
 * @param options - Upload options (folder, transformations)
 * @returns Cloudinary upload result with secure_url
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const {
      folder = 'servio',
      width,
      height,
      crop = 'limit',
    } = options;

    // Create upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: width && height ? [
          { width, height, crop }
        ] : undefined,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public_id of the image
 * @returns Deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};