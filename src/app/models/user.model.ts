export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;

  created_at?: Date;
  updated_at?: Date;

  //avatar_path: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  department?: string;
}

export interface TaskReport {
  id: string;
  taskId: string;
  userId: string;
  description: string;
  imageUrl?: string;
  createdAt: Date;
}
