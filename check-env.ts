import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : 'UNDEFINED');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : 'UNDEFINED');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'UNDEFINED');
console.log('ADMIN_ORIGIN:', process.env.ADMIN_ORIGIN);
console.log('PARTNER_ORIGIN:', process.env.PARTNER_ORIGIN);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);