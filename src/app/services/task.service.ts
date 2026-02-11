import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Task } from '../models/task.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadTasks();
  }

  private transformTask(task: any): Task {
    return {
      id: task.id?.toString() || '',
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.due_date ? new Date(task.due_date) : new Date(),
      completed: task.completed || false,
      employeeId: task.employee_id || task.assigned_to || undefined,
      createdAt: task.created_at ? new Date(task.created_at) : new Date(),
      updatedAt: task.updated_at ? new Date(task.updated_at) : new Date()
    };
  }

  loadTasks(): void {
    this.apiService.getTasks()
      .subscribe({
        next: (response: any) => {
          // Handle paginated response: { success, data: { current_page, data: [...] } }
          // or wrapped response: { success, data: [...] }
          // or direct array: [...]

          let tasksRaw: any[] = [];

          if (response.data && Array.isArray(response.data.data)) {
            // Paginated response
            tasksRaw = response.data.data;
          } else if (Array.isArray(response.data)) {
            // Wrapped response
            tasksRaw = response.data;
          } else if (Array.isArray(response)) {
            // Direct array
            tasksRaw = response;
          }

          // Transform snake_case to camelCase
          const tasks = tasksRaw.map(t => this.transformTask(t));
          this.tasksSubject.next(tasks);
        },
        error: () => this.tasksSubject.next([])
      });
  }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  getTaskById(id: string): Task | undefined {
    return this.tasksSubject.value.find(task => task.id === id);
  }

  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Observable<Task> {
    return this.apiService.createTask(task).pipe(
      tap(newTask => {
        const transformedTask = this.transformTask(newTask);
        const tasks = [...this.tasksSubject.value, transformedTask];
        this.tasksSubject.next(tasks);
      })
    );
  }

  updateTask(id: string, updates: Partial<Task>): Observable<Task> {
    return this.apiService.updateTask(id, updates).pipe(
      tap(updatedTask => {
        const transformedTask = this.transformTask(updatedTask);
        const tasks = this.tasksSubject.value.map(task =>
          task.id === id ? transformedTask : task
        );
        this.tasksSubject.next(tasks);
      })
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.apiService.deleteTask(id).pipe(
      tap(() => {
        const tasks = this.tasksSubject.value.filter(task => task.id !== id);
        this.tasksSubject.next(tasks);
      })
    );
  }

  toggleTaskCompletion(id: string): void {
    const task = this.getTaskById(id);
    if (task) {
      this.updateTask(id, { completed: !task.completed }).subscribe();
    }
  }
}
