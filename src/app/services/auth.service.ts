import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../models/user.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private apiService: ApiService) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
      this.currentUserSubject.next(JSON.parse(storedUser));
      this.tokenSubject.next(storedToken);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.apiService.login(credentials).pipe(
      map((response: any) => this.transformAuthResponse(response)),
      tap(res => this.setAuth(res))
    );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    return this.apiService.register(data).pipe(
      map((response: any) => this.transformAuthResponse(response)),
      tap(res => this.setAuth(res))
    );
  }

  /**
   * Transform API response to AuthResponse format
   * Handles both formats:
   * 1. { success: true, data: { user: {...}, token: "..." }, message: "..." } (wrapped format)
   * 2. { user: {...}, token: "..." } (direct format)
   */
  private transformAuthResponse(response: any): AuthResponse {
    // Check if response is wrapped with success/data structure
    if (response.success && response.data) {
      return {
        user: response.data.user,
        token: response.data.token
      };
    }
    
    // Check if response has user and token directly
    if (response.user && response.token) {
      return {
        user: response.user,
        token: response.token
      };
    }
    
    // Handle Laravel Sanctum response format
    if (response.data?.user && response.data?.token) {
      return {
        user: response.data.user,
        token: response.data.token
      };
    }
    
    throw new Error('Invalid response format');
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  isEmployee(): boolean {
    return this.currentUserSubject.value?.role === 'employee';
  }

  private setAuth(response: AuthResponse): void {
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    localStorage.setItem('authToken', response.token);
    this.currentUserSubject.next(response.user);
    this.tokenSubject.next(response.token);
  }
}
