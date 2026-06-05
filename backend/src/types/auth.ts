export interface AuthorizerContext {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
