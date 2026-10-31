export interface AuthUser {
  id: number;
  telegramId: number;
  username: string;
  phone?: string;
  fullName?: string;
  lastLogin?: string;
}