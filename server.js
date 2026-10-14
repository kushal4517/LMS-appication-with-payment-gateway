require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const REQUIRED = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
['CLOUDINARY_CLOUD_NAME', 'RAZORPAY_KEY_ID', 'RAZORPAY_WEBHOOK_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
  .filter((k) => !process.env[k])
  .forEach((k) => logger.warn(`${k} not set - related feature will not work`));

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));

  const shutdown = (sig) => {
    logger.info(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.stack || err}`);
    server.close(() => process.exit(1));
  });
})();
