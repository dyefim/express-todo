export {};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }

  interface AuthUser {
    id: number;
  }
}
