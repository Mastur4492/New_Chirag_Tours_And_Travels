import { AuthenticatedUser } from '@chirag/types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
