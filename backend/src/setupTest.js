// Set test environment variables before any module imports resolve.
// dotenv.config() in env.ts will see these values and not override them.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_only';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_only';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
process.env.JWT_SALT = '10';
