import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from '../models/task.model';
import { User, LoginCredentials, RegisterData } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Auth endpoints - returns raw response for AuthService to handle
  login(credentials: LoginCredentials): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, credentials, { 
      headers: this.getHeaders() 
    });
  }

  register(data: RegisterData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/register`, data, { 
      headers: this.getHeaders() 
    });
  }

  // Task endpoints
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`, { headers: this.getHeaders() });
  }

  getTaskById(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${id}`, { headers: this.getHeaders() });
  }

  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks`, task, { headers: this.getHeaders() });
  }

  updateTask(id: string, updates: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/tasks/${id}`, updates, { headers: this.getHeaders() });
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`, { headers: this.getHeaders() });
  }

  // Bulk operations
  bulkUpdateTasks(tasks: Partial<Task>[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/tasks/bulk`, { tasks }, { headers: this.getHeaders() });
  }

  bulkDeleteTasks(ids: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/bulk-delete`, { ids }, { headers: this.getHeaders() });
  }

  // Filter and search
  searchTasks(query: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks/search?q=${encodeURIComponent(query)}`, { 
      headers: this.getHeaders() 
    });
  }

  getTasksByStatus(status: 'completed' | 'pending'): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks?status=${status}`, { headers: this.getHeaders() });
  }

  getTasksByPriority(priority: 'low' | 'medium' | 'high'): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks?priority=${priority}`, { headers: this.getHeaders() });
  }

  getTasksByUser(userId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks?user_id=${userId}`, { headers: this.getHeaders() });
  }

  // User management (admin only)
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`, { headers: this.getHeaders() });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users/${id}`, updates, { headers: this.getHeaders() });
  }

  // Profile avatar upload
  uploadAvatar(userId: string, avatarData: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/avatar`, { avatar: avatarData }, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      })
    });
  }

  // Change password
  changePassword(userId: string, currentPassword: string, newPassword: string, passwordConfirmation: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/password/change`, {
      user_id: userId,
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: passwordConfirmation
    }, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      })
    });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  // Task reports with images
  uploadTaskReport(taskId: string, description: string, imageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('image', imageFile);
    
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/report`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      })
    });
  }

  getTaskReports(taskId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/task-reports/task/${taskId}`, { 
      headers: this.getHeaders() 
    });
  }
}
