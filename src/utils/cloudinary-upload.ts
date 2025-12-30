// src/utils/cloudinary-upload.ts
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

interface UploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
  resourceType?: 'auto' | 'image' | 'video' | 'raw'; // ✅ Added
}

/**
 * Upload file buffer to Cloudinary
 * @param buffer - File buffer from multer
 * @param options - Upload options (folder, transformations, resourceType)
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
      resourceType = 'auto', // ✅ Default to auto, but allow override
    } = options;

    // Create upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType, // ✅ Use the provided resource_type
        transformation: width && height && resourceType !== 'raw' ? [
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
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public_id of the file
 * @param resourceType - Type of resource (image, video, raw)
 * @returns Deletion result
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};