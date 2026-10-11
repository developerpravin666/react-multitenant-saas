export interface LoginInput {
  tenantSlug: string;
  username: string;
  password: string;
}

export interface AdminLoginInput {
  username: string;
  password: string;
}

export interface AuthUser {
  id?: string;
  username: string;
  displayName?: string;
  tenantSlug?: string;
  email?: string;
  isProductOwner?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: AuthUser;
  tenantId?: string;
  isProductOwner?: boolean;
}

