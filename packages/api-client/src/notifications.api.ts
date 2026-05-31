import { http } from './http';

export interface RegisterTokenDto {
  token: string;
  platform?: 'ios' | 'android' | 'web';
  app?: 'customer' | 'business' | 'driver';
}

export const notificationsApi = {
  registerToken: (dto: RegisterTokenDto) =>
    http.post<{ registered: boolean }>('/notifications/register-token', dto).then((r) => r.data),

  unregisterToken: (token: string) =>
    http
      .delete<{ unregistered: boolean }>('/notifications/token', { data: { token } })
      .then((r) => r.data),
};
