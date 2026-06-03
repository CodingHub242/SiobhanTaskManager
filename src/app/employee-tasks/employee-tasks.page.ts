import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from '../services/task.service';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import { arrowBack, person, calendar, flag, checkmark, close, layers, alertCircle, time } from 'ionicons/icons';

interface EmployeeTaskGroup {
  employee: User;
  tasks: Task[];
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

@Component({
  selector: 'app-employee-tasks',
  templateUrl: './employee-tasks.page.html',
  styleUrls: ['./employee-tasks.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EmployeeTasksPage implements OnInit {
  tasks: Task[] = [];
  users: User[] = [];
  employeeTaskGroups: EmployeeTaskGroup[] = [];
  selectedFilter: 'all' | 'completed' | 'pending' | 'overdue' = 'all';
  selectedEmployeeId: string | null = null;
  pageTitle: string = 'All Tasks';
  showAllEmployees: boolean = true;

  constructor(
    private navController: NavController,
    private route: ActivatedRoute,
    private taskService: TaskService,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    addIcons({ arrowBack, person, calendar, flag, checkmark, close, layers, alertCircle, time });
  }

ngOnInit() {
    // Get filter and employeeId from query params
    this.route.queryParams.subscribe(params => {
      const filter = params['filter'] || 'all';
      this.selectedFilter = filter as 'all' | 'completed' | 'pending' | 'overdue';
      this.selectedEmployeeId = params['employeeId'] || null;
      this.pageTitle = this.getFilterTitle(this.selectedFilter);
      this.showAllEmployees = !this.selectedEmployeeId;
    });
    
    this.loadData();
  }

  loadData() {
    // Load tasks
    this.taskService.loadTasks();
    this.taskService.tasks$.subscribe(tasks => {
      this.tasks = tasks;
      this.groupTasksByEmployee();
    });

    // Load users
    this.apiService.getUsers().subscribe({
      next: (response: any) => {
        let usersRaw: any[] = [];
        if (response && Array.isArray(response)) {
          usersRaw = response;
        } else if (response && response.data && Array.isArray(response.data.data)) {
          usersRaw = response.data.data;
        } else if (response && response.data && Array.isArray(response.data)) {
          usersRaw = response.data;
        }

        this.users = (usersRaw || []).map((u: any) => ({
          id: u.id?.toString() || '',
          email: u.email || '',
          name: u.name || '',
          role: u.role || 'employee',
          department: u.department || u.dept_name || undefined,
          avatar: u.avatar || u.profile_picture || undefined,
          phone: u.phone || u.phone_number || undefined,
          createdAt: u.created_at ? new Date(u.created_at) : new Date(),
          updatedAt: u.updated_at ? new Date(u.updated_at) : new Date()
        })).filter(u => u.role === 'employee' || !u.role);

        this.groupTasksByEmployee();
      }
    });
  }

groupTasksByEmployee() {
    const groups: EmployeeTaskGroup[] = [];
    let employees = this.users.filter(u => u.role === 'employee' || !u.role);

    // Filter to specific employee if selectedEmployeeId is provided
    if (this.selectedEmployeeId) {
      employees = employees.filter(u => u.id === this.selectedEmployeeId);
      if (employees.length > 0) {
        const selectedEmployee = employees[0];
        this.pageTitle = `${selectedEmployee.name}'s Tasks`;
      }
    }

    employees.forEach(employee => {
      let employeeTasks = this.tasks.filter(t => t.employeeId === employee.id);

      // Apply filter
      if (this.selectedFilter === 'completed') {
        employeeTasks = employeeTasks.filter(t => t.completed);
      } else if (this.selectedFilter === 'pending') {
        employeeTasks = employeeTasks.filter(t => !t.completed);
      } else if (this.selectedFilter === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        employeeTasks = employeeTasks.filter(t => !t.completed && new Date(t.dueDate) < today);
      }

      // Always show if showAllEmployees is true, OR 
      // if this is the selected employee (even with 0 filtered tasks)
      const shouldShow = this.showAllEmployees || (this.selectedEmployeeId && employee.id === this.selectedEmployeeId);
      
      if (employeeTasks.length > 0 || shouldShow) {
        const allEmployeeTasks = this.tasks.filter(t => t.employeeId === employee.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        groups.push({
          employee,
          tasks: employeeTasks,
          total: allEmployeeTasks.length,
          completed: allEmployeeTasks.filter(t => t.completed).length,
          pending: allEmployeeTasks.filter(t => !t.completed).length,
          overdue: allEmployeeTasks.filter(t => !t.completed && new Date(t.dueDate) < today).length
        });
      }
    });

    // Sort by total tasks (descending)
    this.employeeTaskGroups = groups.sort((a, b) => b.total - a.total);
  }

setFilter(filter: 'all' | 'completed' | 'pending' | 'overdue') {
    this.selectedFilter = filter;
    // Only update title if not viewing a specific employee
    if (!this.selectedEmployeeId) {
      this.pageTitle = this.getFilterTitle(filter);
    } else {
      // For specific employee, update the filter part of the title
      this.pageTitle = `${this.getEmployeeName()}'s ${this.getFilterTitle(filter)}`;
    }
    this.groupTasksByEmployee();
  }

  getFilterTitle(filter: string): string {
    switch (filter) {
      case 'all': return 'All Tasks';
      case 'completed': return 'Completed Tasks';
      case 'pending': return 'Pending Tasks';
      case 'overdue': return 'Overdue Tasks';
      default: return 'Tasks';
    }
  }

  getEmployeeName(): string {
    if (!this.selectedEmployeeId) return '';
    const employee = this.users.find(u => u.id === this.selectedEmployeeId);
    return employee ? employee.name : '';
  }

  getEmployeeInitials(employee: User): string {
    const names = employee.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  }

  getDueDateClass(task: Task): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (task.completed) return 'completed';
    const diff = dueDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'overdue';
    if (days === 0) return 'due-today';
    return '';
  }

goBack() {
    this.navController.back();
  }

  toggleShowAllEmployees() {
    this.showAllEmployees = !this.showAllEmployees;
    this.selectedEmployeeId = this.showAllEmployees ? null : this.selectedEmployeeId;
    if (this.showAllEmployees) {
      this.pageTitle = this.getFilterTitle(this.selectedFilter);
    } else if (this.selectedEmployeeId) {
      this.pageTitle = `${this.getEmployeeName()}'s Tasks`;
    }
    this.groupTasksByEmployee();
  }

  get isViewingSpecificEmployee(): boolean {
    return !!this.selectedEmployeeId;
  }
}
