import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons, IonAvatar, IonList, IonItem, IonLabel, IonIcon, IonCheckbox, IonChip, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption, IonDatetime, IonModal } from '@ionic/angular/standalone';
import { IonicModule, ModalController, AlertController, NavController, ActionSheetController, ToastController, PopoverController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { addIcons } from 'ionicons';
import { briefcase,add, trash, create, mail, document, close, eye, download, checkmark, arrowBack, arrowUp, arrowDown, filter, cloudUpload, checkmarkCircle, layers, time, alertCircle, chevronBack, chevronForward, chevronDown, person, logOut, list, calendar, analytics, trendingUp, flag, folderOpen, ellipse, business, swapHorizontal } from 'ionicons/icons';
import { TaskModalPage } from '../task-modal/task-modal.page';
import { DayTasksModalPage } from '../day-tasks-modal/day-tasks-modal.page';


interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface EmployeeTaskGroup {
  employee: User;
  tasks: Task[];
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [IonicModule, 
    // IonContent, 
    // IonHeader, 
    // IonTitle, 
    // IonToolbar, 
    // IonButton, 
    // IonButtons, 
   // IonAvatar, 
   // IonList, 
   // IonItem, 
   // IonLabel, 
   // IonIcon, 
    //IonCheckbox, 
    //IonChip, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption, IonDatetime, IonModal, CommonModule, FormsModule, TaskModalPage, DayTasksModalPage]
})
export class AdminDashboardPage implements OnInit {
  Math = Math;
  showUserMenu = false;
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  paginatedTasks: Task[] = [];
  users: User[] = [];
  selectedDate: Date = new Date();
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  viewMode: 'list' | 'calendar' | 'analytics' = 'list';
  showAssignModal: boolean = false;
  showDatePicker: boolean = false;
  selectedReassignDate: string = new Date().toISOString();
  pendingReassignTask: Task | null = null;
  selectedCalendarDate: Date | null = null;
  currentDate: Date = new Date();
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  
  // Filter
  filter: 'all' | 'completed' | 'pending' | 'overdue' = 'all';
  
  // View mode for list: 'all' (flat) or 'grouped' (by employee)
  listViewMode: 'all' | 'grouped' = 'grouped';
  
  // Employee task groups
  employeeTaskGroups: EmployeeTaskGroup[] = [];
  
  private destroy$ = new Subject<void>();

  // Chart data
  tasksByPriority: ChartData[] = [];
  tasksByStatus: ChartData[] = [];
  weeklyTasks: ChartData[] = [];

  constructor( private taskService: TaskService,
    private apiService: ApiService,
    private authService: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
    private navController: NavController,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private popoverController: PopoverController) {
      addIcons({briefcase,chevronBack,chevronForward,chevronDown,alertCircle, add, trash, create, mail, document, close, eye, download, checkmark, arrowBack, arrowUp, arrowDown, filter,checkmarkCircle,cloudUpload,layers,time,person,logOut,list,calendar,analytics,trendingUp,flag,folderOpen,ellipse,business,swapHorizontal});
     }

  ngOnInit() {
    this.loadTasks();
    this.loadUsers();
    this.generateCalendar();
  }

   ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTasks(): void {
    // First load tasks from service, then subscribe to observable
    this.taskService.loadTasks();
    
    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tasks: any) => {
        console.log('AdminDashboard received tasks:', tasks);
        // Ensure tasks is always an array
        this.tasks = Array.isArray(tasks) ? tasks : [];
        //make sure completed status is set to true for completed tasks
        this.tasks.forEach(task => {
          if (task.status == 'completed') {
            task.completed = true;
          }
        })
        console.log('AdminDashboard processed tasks:', this.tasks.length);
        this.totalItems = this.tasks.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.filterTasksLocal();
        this.updatePaginatedTasks();
        this.generateCalendar();
        this.calculateChartData();
      });
  }

  loadUsers(): void {
    this.apiService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Handle paginated response: { success, data: { current_page, data: [...] } }
          // or wrapped response: { success, data: [...] }
          // or direct array: [...]
          let usersRaw: any[] = [];
          
          if (response && Array.isArray(response)) {
            // Direct array
            usersRaw = response;
          } else if (response && response.data && Array.isArray(response.data.data)) {
            // Paginated response
            usersRaw = response.data.data;
          } else if (response && response.data && Array.isArray(response.data)) {
            // Wrapped response
            usersRaw = response.data;
          } else {
            // Fallback: try to handle unexpected format
            console.warn('Unexpected users response format:', response);
            usersRaw = [];
          }
          
          // Transform snake_case to camelCase
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
          }));
        },
        error: () => this.users = []
      });
  }

  calculateChartData(): void {
    const tasks = this.tasks || [];
    
    // Tasks by Priority
    const priorityCounts = { low: 0, medium: 0, high: 0 };
    tasks.forEach(task => {
      priorityCounts[task.priority]++;
    });
    this.tasksByPriority = [
      { label: 'High', value: priorityCounts.high, color: '#ff4961' },
      { label: 'Medium', value: priorityCounts.medium, color: '#ffce00' },
      { label: 'Low', value: priorityCounts.low, color: '#2dd36f' }
    ];

    // Tasks by Status  completed: (task.status == 'completed') ? true : task.completed || false,
    const completed = (this.tasks || []).filter(t => (t.status == 'completed') ? true : t.completed).length;
    const pending = (this.tasks || []).filter(t => !t.completed).length;
    const overdue = (this.tasks || []).filter(t => !t.completed && new Date(t.dueDate) < new Date()).length;
    this.tasksByStatus = [
      { label: 'Completed', value: completed, color: '#2dd36f' },
      { label: 'Pending', value: pending - overdue, color: '#ffce00' },
      { label: 'Overdue', value: overdue, color: '#ff4961' }
    ];

    // Weekly Tasks
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    
    (this.tasks || []).forEach(task => {
      const taskDate = new Date(task.dueDate);
      const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= -7 && diffDays < 7) {
        const dayIndex = (today.getDay() + diffDays + 7) % 7;
        if (dayIndex >= 0 && dayIndex < 7) {
          weekData[dayIndex]++;
        }
      }
    });
    
    this.weeklyTasks = days.map((day, index) => ({
      label: day,
      value: weekData[index],
      color: index === today.getDay() ? '#3880ff' : '#92949c'
    }));
  }

  generateCalendar(): void {
    console.log(this.tasks);
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayTasks = this.tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.toDateString() === date.toDateString();
      });

      this.calendarDays.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        tasks: dayTasks
      });
    }
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  resetToToday(): void {
    this.currentMonth = new Date();
    this.generateCalendar();
  }

  setViewMode(mode: 'list' | 'calendar' | 'analytics'): void {
    this.viewMode = mode;
    if (mode === 'calendar') {
      this.generateCalendar();
    }
    if (mode === 'analytics') {
      this.calculateChartData();
    }
  }

  async onCalendarDayClick(day: CalendarDay): Promise<void> {
    if (!day.isCurrentMonth) return;
    
    const modal = await this.modalController.create({
      component: DayTasksModalPage,
      componentProps: { 
        selectedDate: day.date, 
        tasks: day.tasks,
        users: this.users
      }
    });
    
    modal.onDidDismiss().then((result) => {
      if (result.data?.refresh) {
        this.taskService.loadTasks();
      }
    });
    
    await modal.present();
  }

  async openAddTaskModalWithDate(date: Date): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'add', selectedDate: date, users: this.users }
    });
    
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) {
        this.showToast('Task created successfully');
        this.taskService.loadTasks();
      }
    });
    
    await modal.present();
  }

  async viewDayTasks(day: CalendarDay): Promise<void> {
    if (day.tasks.length === 0) {
      this.showToast('No tasks for this day');
      return;
    }

    const buttons = day.tasks.map(task => ({
      text: task.title + (task.completed ? ' ✓' : ''),
      icon: task.completed ? 'checkmark-circle' : 'ellipse',
      handler: () => this.openEditTaskModal(task)
    }));

    buttons.push({ text: 'Cancel', icon: 'close', role: 'cancel' } as any);

    const actionSheet = await this.actionSheetController.create({
      header: `Tasks - ${day.date.toLocaleDateString()}`,
      buttons
    });
    await actionSheet.present();
  }

  async openAddTaskModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'add', users: this.users }
    });
    
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) {
        this.showToast('Task created successfully');
        this.taskService.loadTasks();
      }
    });
    
    await modal.present();
  }

  async openEditTaskModal(task: Task): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'edit', task, users: this.users }
    });
    
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) {
        this.showToast('Task updated successfully');
        this.taskService.loadTasks();
      }
    });
    
    await modal.present();
  }

  async viewTask(task: Task): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'view', task, users: this.users }
    });
    
    await modal.present();
  }

  async deleteTask(task: Task): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', handler: () => this.taskService.deleteTask(task.id).subscribe() }
      ]
    });
    await alert.present();
  }

  // Reassign task - show date picker first, then employee selector
  async reassignTask(task: Task): Promise<void> {
    this.pendingReassignTask = task;
    this.selectedReassignDate = new Date().toISOString(); // Default to today
    this.showDatePicker = true;
  }

  async onDateSelected(): Promise<void> {
    if (!this.pendingReassignTask) return;
    
    const employees = this.users.filter(u => u.role === 'employee' || !u.role);
    
    const actionSheet = await this.actionSheetController.create({
      header: 'Reassign Task to:',
      buttons: [
        ...employees.map(emp => ({
          text: emp.name,
          handler: () => {
            const selectedDate = new Date(this.selectedReassignDate);
            this.createReassignedTask(this.pendingReassignTask!, emp.id, selectedDate);
          }
        })),
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ]
    });
    
    this.showDatePicker = false;
    await actionSheet.present();
  }

  cancelReassign(): void {
    this.showDatePicker = false;
    this.pendingReassignTask = null;
  }

  private async createReassignedTask(originalTask: Task, newEmployeeId: string, selectedDate: Date): Promise<void> {
    try {
      // Format date as YYYY-MM-DD for the API
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Create a new task for the new employee
      const newTaskData: any = {
        title: originalTask.title,
        description: originalTask.description,
        priority: originalTask.priority,
        //dueDate should be tomorrow to pass validation
        dueDate: formattedDate,
        completed: false,
        employee_id: newEmployeeId
      };

      console.log('Creating reassigned task with data:', newTaskData);

      this.apiService.createTask(newTaskData).subscribe({
        next: (response) => {
          console.log('Task reassigned successfully, response:', response);
          this.showToast('Task reassigned successfully');
          this.taskService.loadTasks();
        },
        error: (error) => {
          console.error('Failed to reassign task:', error);
          this.showToast('Failed to reassign task');
        }
      });
    } catch (error) {
      this.showToast('Error reassigning task');
    }
  }

  // Filter methods
  setFilter(filter: 'all' | 'completed' | 'pending' | 'overdue'): void {
    this.filter = filter;
    this.currentPage = 1;
    this.filterTasksLocal();
  }

  filterTasksLocal(): void {
    let filtered = this.tasks;

    if (this.filter === 'completed') {
      filtered = this.tasks.filter(t => t.completed);
    } else if (this.filter === 'pending') {
      filtered = this.tasks.filter(t => !t.completed);
    } else if (this.filter === 'overdue') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = this.tasks.filter(t => !t.completed && new Date(t.dueDate) < today);
    }

    this.filteredTasks = filtered;
    this.totalItems = this.filteredTasks.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.updatePaginatedTasks();
    
    // Also update employee groups
    this.groupTasksByEmployee();
  }

  groupTasksByEmployee(): void {
    const groups: EmployeeTaskGroup[] = [];
    const employees = this.users.filter(u => u.role === 'employee' || !u.role);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    employees.forEach(employee => {
      let employeeTasks = this.filteredTasks.filter(t => t.employeeId === employee.id);

      if (employeeTasks.length > 0) {
        const allEmployeeTasks = this.tasks.filter(t => t.employeeId === employee.id);
        
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

  setListViewMode(mode: 'all' | 'grouped'): void {
    this.listViewMode = mode;
  }

  // Pagination methods
  updatePaginatedTasks(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedTasks = this.filteredTasks.slice(startIndex, endIndex);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.updatePaginatedTasks();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTasks();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedTasks();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedTasks();
    }
  }

  toggleTask(task: Task): void {
    this.taskService.toggleTaskCompletion(task.id);
  }

  async logout(): Promise<void> {
    this.showUserMenu = false;
    await this.popoverController.dismiss();
    this.authService.logout();
    this.navController.navigateRoot('/login');
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  async navigateToProfile(): Promise<void> {
    await this.popoverController.dismiss();
    this.navController.navigateRoot('/profile');
  }

  async navigateToEmployeeTasks(filter: string): Promise<void> {
    this.showUserMenu = false;
    try {
      // Try to dismiss any open popover, but don't fail if none exists
      const popover = await this.popoverController.getTop();
      if (popover) {
        await popover.dismiss();
      }
    } catch (error) {
      // Ignore errors - popover may not exist
      console.log('No popover to dismiss');
    }
    
    // Navigate to employee tasks page with filter parameter
    await this.navController.navigateForward('/employee-tasks', {
      queryParams: { filter: filter }
    });
  }

  getCurrentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return '?';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  }

  getAvatarUrl(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.avatar) return '';
    if (user.avatar.startsWith('http') || user.avatar.startsWith('https')) {
      return user.avatar;
    }
    return `https://ecg.codepps.online/storage/${user.avatar}`;
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Stats methods
  getTotalTasks(): number {
    return (this.tasks || []).length;
  }

  getCompletedTasks(): number {
    return (this.tasks || []).filter(t => t.completed).length;
  }

  getPendingTasks(): number {
    return (this.tasks || []).filter(t => !t.completed).length;
  }

  getOverdueTasks(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (this.tasks || []).filter(t => !t.completed && new Date(t.dueDate) < today).length;
  }

  getDueDateClass(task: Task): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (task.completed) return 'completed-chip';
    const diff = dueDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'overdue-chip';
    if (days === 0) return 'due-today-chip';
    return '';
  }

  getEmployeeName(employeeId?: string): string {
    if (!employeeId) return '';
    const user = this.users.find(u => u.id === employeeId);
    return user ? user.name : '';
  }

  getEmployeeInitials(employeeId?: string): string {
    if (!employeeId) return '';
    const user = this.users.find(u => u.id === employeeId);
    if (!user) return '';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  }

  getEmployeeInitialsFromUser(user: User): string {
    if (!user) return '';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  }

  getCompletionRate(): number {
    const tasks = this.tasks || [];
    if (tasks.length === 0) return 0;
    return Math.round((this.getCompletedTasks() / tasks.length) * 100);
  }

  getWeeklyGrowth(): number {
    // Mock weekly growth percentage
    return 12;
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    await toast.present();
  }

}
