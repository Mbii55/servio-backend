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

// Payment Gateway (Noqoody) - Sandbox
console.log('\n--- Noqoody Sandbox ---');
console.log('NOQOODY_SANDBOX_URL:', process.env.NOQOODY_SANDBOX_URL);
console.log('NOQOODY_SANDBOX_USERNAME:', process.env.NOQOODY_SANDBOX_USERNAME);
console.log('NOQOODY_SANDBOX_PASSWORD:', process.env.NOQOODY_SANDBOX_PASSWORD ? '***SET***' : 'UNDEFINED');
console.log('NOQOODY_SANDBOX_PROJECT_CODE:', process.env.NOQOODY_SANDBOX_PROJECT_CODE);
console.log('NOQOODY_SANDBOX_CLIENT_SECRET:', process.env.NOQOODY_SANDBOX_CLIENT_SECRET ? '***SET***' : 'UNDEFINED');

// Payment Gateway (Noqoody) - Live
console.log('\n--- Noqoody Live ---');
console.log('NOQOODY_LIVE_URL:', process.env.NOQOODY_LIVE_URL);
console.log('NOQOODY_LIVE_USERNAME:', process.env.NOQOODY_LIVE_USERNAME);
console.log('NOQOODY_LIVE_PASSWORD:', process.env.NOQOODY_LIVE_PASSWORD ? '***SET***' : 'UNDEFINED');
console.log('NOQOODY_LIVE_PROJECT_CODE:', process.env.NOQOODY_LIVE_PROJECT_CODE);
console.log('NOQOODY_LIVE_CLIENT_SECRET:', process.env.NOQOODY_LIVE_CLIENT_SECRET ? '***SET***' : 'UNDEFINED');

// Mobile & API URLs
console.log('\n--- App URLs ---');
console.log('MOBILE_APP_URL:', process.env.MOBILE_APP_URL);
console.log('API_URL:', process.env.API_URL);

console.log('\n--- Server Config ---');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Environment-based usage
console.log('\n--- Active Configuration ---');
if (process.env.NODE_ENV === 'production') {
  console.log('✅ Using LIVE Noqoody credentials');
} else {
  console.log('✅ Using SANDBOX Noqoody credentials');
}