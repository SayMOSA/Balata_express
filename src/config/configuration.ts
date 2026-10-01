import 'dotenv/config';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/domino-platform',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES || '10', 10),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  corsOrigin: process.env.CORS_ORIGIN,
};

if (
  config.nodeEnv === 'production' &&
  (config.jwt.accessSecret === 'access_secret' || config.jwt.refreshSecret === 'refresh_secret')
) {
  console.warn('⚠️  JWT secrets are using insecure defaults. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
}
