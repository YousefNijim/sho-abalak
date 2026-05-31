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

export interface RegisterBusinessDto {
  name: string;
  type: 'FOOD' | 'STORE';
  tagIds?: string[];
  ownerName: string;
  phone: string;
  areaId: string;
  addressDetail?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  name?: string;
  email?: string;
  imageUrl?: string;
  phone?: string;
  otpCode?: string;
}

export interface AuthUserProfile {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  areaId: string | null;
  email: string | null;
  imageUrl: string | null;
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

  registerBusiness: (dto: RegisterBusinessDto) =>
    http
      .post<{ submitted: boolean; status: string }>('/auth/register-business', dto)
      .then((r) => r.data),

  changePassword: (dto: ChangePasswordDto) =>
    http.patch<{ changed: boolean }>('/auth/change-password', dto).then((r) => r.data),

  me: () =>
    http.get<AuthUserProfile>('/auth/me').then((r) => r.data),

  updateProfile: (dto: UpdateProfileDto) =>
    http.patch<AuthUserProfile>('/auth/profile', dto).then((r) => r.data),

  otpRequest: (phone: string) =>
    http.post<{ phone: string; sent: boolean; devCode?: string }>('/auth/otp/request', { phone }).then((r) => r.data),

  otpVerify: (phone: string, code: string) =>
    http.post<{ phone: string; verified: boolean }>('/auth/otp/verify', { phone, code }).then((r) => r.data),
};
