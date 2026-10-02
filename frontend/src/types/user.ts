/** Tipos compartidos del dominio de usuarios. */

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRegisterData {
  full_name: string;
  email: string;
  phone?: string | null;
  password: string;
}

export interface UserUpdateData {
  full_name?: string;
  phone?: string | null;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
}
