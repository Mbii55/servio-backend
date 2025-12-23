// src/utils/cloudinary-delete-by-url.ts
import cloudinary from "../config/cloudinary";

/**
 * Extract Cloudinary public_id from a secure_url
 * Example:
 * https://res.cloudinary.com/your_cloud/image/upload/v123456789/servio/abc123.jpg
 *  -> public_id: "servio/abc123"
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/"); 
    // ["", "your_cloud", "image", "upload", "v123456789", "folder", "file.jpg"]

    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // Take everything after "upload"
    let publicParts = parts.slice(uploadIndex + 1);

    // Drop version (v123456789) if present
    if (publicParts[0] && /^v[0-9]+$/.test(publicParts[0])) {
      publicParts = publicParts.slice(1);
    }

    const fileWithExt = publicParts.pop();
    if (!fileWithExt) return null;

    const dotIndex = fileWithExt.lastIndexOf(".");
    const filename =
      dotIndex === -1 ? fileWithExt : fileWithExt.slice(0, dotIndex);

    publicParts.push(filename);
    return publicParts.join("/");
  } catch (e) {
    console.warn("Failed to parse Cloudinary URL:", url);
    return null;
  }
}

export async function deleteCloudinaryImageByUrl(url: string) {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) {
    console.warn("Could not extract public_id from URL:", url);
    return;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Cloudinary delete result:", publicId, result);
  } catch (err) {
    console.error("Error deleting Cloudinary image:", err);
  }
}
