// Shared authorizer context type — used by both the authorizer handler and protected handlers
export interface AuthorizerContext {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
