import { http } from './http';

export interface LoginDto {
  phone: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  phone: string;
  password: string;
  areaId?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    status: string;
    areaId: string | null;
  };
}

export const authApi = {
  login: (dto: LoginDto) =>
    http.post<AuthResponse>('/auth/login', dto).then((r) => r.data),

  register: (dto: RegisterDto) =>
    http.post<AuthResponse>('/auth/register', dto).then((r) => r.data),

  me: () =>
    http.get<AuthResponse['user']>('/auth/me').then((r) => r.data),

  otpRequest: (phone: string) =>
    http.post('/auth/otp/request', { phone }).then((r) => r.data),

  otpVerify: (phone: string, code: string) =>
    http.post('/auth/otp/verify', { phone, code }).then((r) => r.data),
};
