// src/config/multer.ts
import multer from 'multer';
import path from 'path';

// Configure multer to use memory storage (temporary)
// Files will be stored in memory, then uploaded to Cloudinary
const storage = multer.memoryStorage();

// File filter - allow images AND PDFs
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Allowed extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (jpg, jpeg, png, gif, webp) and PDFs are allowed'), false);
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// ✨ NEW: Separate configuration for verification documents (PDFs only, larger size)
const verificationFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDFs and images are allowed for verification documents'), false);
  }
};

// Export separate upload config for verification documents
export const uploadVerificationDocument = multer({
  storage: storage,
  fileFilter: verificationFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for verification documents
  },
});