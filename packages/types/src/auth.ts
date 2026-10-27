import { UserDto, UserRole } from './user';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  mobile: string;
  email?: string;
  fullName: string;
}

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
  mobile: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  tokenVersion?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: UserDto;
  accessToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}
