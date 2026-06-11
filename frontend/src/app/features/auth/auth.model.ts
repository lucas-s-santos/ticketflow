export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'ORGANIZADOR' | 'CLIENTE';
}

export interface AuthResponse {
  token: string;
  type: string;
  name: string;
  email: string;
  role: string;
  expiresIn: number;
}

export interface StoredUser {
  name: string;
  email: string;
  role: string;
}
