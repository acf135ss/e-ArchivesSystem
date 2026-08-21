import request from './request';

export interface UserInfo {
  id: number;
  username: string;
  real_name: string | null;
  status: number;
  created_at: string;
}

export async function login(username: string, password: string) {
  const { data } = await request.post('/auth/login', { username, password });
  return data;
}

export async function register(username: string, password: string, realName?: string) {
  const { data } = await request.post('/auth/register', {
    username,
    password,
    real_name: realName || null,
  });
  return data;
}

export async function getMe(): Promise<UserInfo> {
  const { data } = await request.get('/auth/me');
  return data;
}
