export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  surname: string;
  email: string;
  password: string;
  confirmPassword: string;
  address?: string;
  city?: string;
  zip?: number;
  phoneNumber?: string;
}

export interface LoginResponse {
  userId: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  role?: string;

  // optional, because backend may return token under one of these names
  accessToken?: string;
  token?: string;
  jwt?: string;
  authToken?: string;
}