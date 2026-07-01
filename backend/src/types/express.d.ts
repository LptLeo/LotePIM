import { TokenPayload } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}
