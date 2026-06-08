import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons, IonAvatar, IonList, IonItem, IonLabel, IonIcon, IonCheckbox, IonChip, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { IonicModule, ModalController, AlertController, NavController, ActionSheetController, ToastController, PopoverController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { addIcons } from 'ionicons';
import { briefcase,add, trash, create, mail, document as docIcon, close, eye, download, checkmark, arrowBack, arrowUp, arrowDown, filter, cloudUpload, checkmarkCircle, layers, time, alertCircle, chevronBack, chevronForward, chevronDown, person, logOut, list, calendar, analytics, trendingUp, flag, folderOpen, ellipse, business, swapHorizontal, people, trophy } from 'ionicons/icons';
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

interface EmployeeCard {
  id: string;
  name: string;
  avatar?: string;
  department?: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  dailyCompletion: number;
  weeklyCompletion: number;
  monthlyCompletion: number;
  yearlyCompletion: number;
  overallCompletion: number;
  selectedPeriod: 'weekly' | 'monthly' | 'yearly';
  selectedMonth: Date | null;
  selectedDay: Date | null;
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
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption, CommonModule, FormsModule, TaskModalPage, DayTasksModalPage]
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
  viewMode: 'list' | 'employees' | 'calendar' | 'analytics' = 'employees';
  showAssignModal: boolean = false;
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

// Employee cards for horizontal slider
  employeeCards: EmployeeCard[] = [];
  
  // Export period
  exportPeriod: 'daily' | 'weekly' | 'monthly' = 'weekly';

  constructor( private taskService: TaskService,
    private apiService: ApiService,
    private authService: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
    private navController: NavController,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private popoverController: PopoverController) {
addIcons({briefcase,people,chevronBack,chevronForward,chevronDown,alertCircle, add, trash, create, mail, docIcon, close, eye, download, checkmark, arrowBack, arrowUp, arrowDown, filter,checkmarkCircle,cloudUpload,layers,time,person,logOut,list,calendar,analytics,trendingUp,flag,folderOpen,ellipse,business,swapHorizontal});
     }

ngOnInit() {
    // Subscribe to tasks once
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
        // Only calculate employee cards if users are already loaded
        if (this.users.length > 0) {
          this.calculateEmployeeCards();
        }
      });
    
    // Load initial data
    this.taskService.loadTasks();
    this.loadUsers();
  }

// Calculate employee cards with completion analytics
  calculateEmployeeCards(): void {
    // Clear top performer cache when employee cards change
    this.clearTopPerformerCache();
    
    const employees = this.users.filter(u => u.role === 'employee' || !u.role);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start of today
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.employeeCards = employees.map(employee => {
      const employeeTasks = this.tasks.filter(t => t.employeeId === employee.id);
      const completedTasks = employeeTasks.filter(t => t.completed);
      
      // Tasks completed today (based on updatedAt)
      const todayCompleted = completedTasks.filter(t => {
        const taskDate = new Date(t.updatedAt);
        return taskDate >= startOfToday;
      }).length;
      
      // Current active tasks today - all pending tasks with due date >= start of today
      // This includes tasks that are either pending or completed today
      const todayActiveTasks = employeeTasks.filter(t => {
        const taskDate = new Date(t.dueDate);
        return taskDate >= startOfToday;
      });
      const todayPending = todayActiveTasks.filter(t => !t.completed).length;
      const todayTotal = todayActiveTasks.length;
      
      // Tasks completed this week
      const weekCompleted = completedTasks.filter(t => {
        const taskDate = new Date(t.updatedAt);
        return taskDate >= startOfWeek;
      }).length;
      
      // Current active tasks this week - all pending tasks with due date >= start of week
      const weekActiveTasks = employeeTasks.filter(t => {
        const taskDate = new Date(t.dueDate);
        return taskDate >= startOfWeek;
      });
      const weekPending = weekActiveTasks.filter(t => !t.completed).length;
      const weekTotal = weekActiveTasks.length;
      
      // Tasks completed this month
      const monthCompleted = completedTasks.filter(t => {
        const taskDate = new Date(t.updatedAt);
        return taskDate >= startOfMonth;
      }).length;
      
      // Current active tasks this month - all pending tasks with due date >= start of month
      const monthActiveTasks = employeeTasks.filter(t => {
        const taskDate = new Date(t.dueDate);
        return taskDate >= startOfMonth;
      });
      const monthPending = monthActiveTasks.filter(t => !t.completed).length;
      const monthTotal = monthActiveTasks.length;
      
return {
        id: employee.id,
        name: employee.name,
        avatar: employee.avatar,
        department: employee.department,
        totalTasks: employeeTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: employeeTasks.length - completedTasks.length,
        // Calculate based on current active tasks (both completed and pending for the period)
        dailyCompletion: todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0,
        weeklyCompletion: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
        monthlyCompletion: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0,
        yearlyCompletion: 0, // Will be calculated dynamically
        overallCompletion: employeeTasks.length > 0 ? Math.round((completedTasks.length / employeeTasks.length) * 100) : 0,
        selectedPeriod: 'monthly' as const,
        selectedMonth: null,
        selectedDay: null,
      };
    });
  }

// Get top performer for a specific period
  private _topPerformerCache: { [key: string]: EmployeeCard | null } = {};
  
  getTopPerformer(period: 'daily' | 'weekly' | 'monthly'): EmployeeCard | null {
    if (this.employeeCards.length === 0) return null;
    
    // Check cache first
    const cacheKey = period;
    if (this._topPerformerCache[cacheKey]) {
      return this._topPerformerCache[cacheKey];
    }
    
    const result = this.employeeCards.slice().sort((a, b) => {
      if (period === 'daily') return b.dailyCompletion - a.dailyCompletion;
      if (period === 'weekly') return b.weeklyCompletion - a.weeklyCompletion;
      return b.monthlyCompletion - a.monthlyCompletion;
    })[0];
    
    this._topPerformerCache[cacheKey] = result;
    return result;
  }
  
  // Clear cache when employee cards change
  private clearTopPerformerCache(): void {
    this._topPerformerCache = {};
  }

  // Set employee period selection
  setEmployeePeriod(employeeId: string, period: 'weekly' | 'monthly' | 'yearly'): void {
    const employee = this.employeeCards.find(e => e.id === employeeId);
    if (employee) {
      employee.selectedPeriod = period;
      // Reset selections when changing period
      if (period === 'weekly') {
        employee.selectedMonth = null;
        employee.selectedDay = null;
      } else if (period === 'monthly') {
        employee.selectedDay = null;
      }
    }
  }

  // Select specific month for monthly view
  selectEmployeeMonth(employeeId: string, event: any): void {
    const employee = this.employeeCards.find(e => e.id === employeeId);
    if (employee && event?.detail?.value) {
      employee.selectedMonth = new Date(event.detail.value);
      this.calculateYearlyCompletionForEmployee(employee);
    }
  }

  // Select specific day for yearly view
  selectEmployeeDay(employeeId: string, event: any): void {
    const employee = this.employeeCards.find(e => e.id === employeeId);
    if (employee && event?.detail?.value) {
      employee.selectedDay = new Date(event.detail.value);
      this.calculateYearlyCompletionForEmployee(employee);
    }
  }

  // Calculate yearly completion for specific selected day
  calculateYearlyCompletionForEmployee(employee: EmployeeCard): void {
    const employeeTasks = this.tasks.filter(t => t.employeeId === employee.id);
    const completedTasks = employeeTasks.filter(t => t.completed);
    
    if (employee.selectedPeriod === 'yearly' && employee.selectedDay) {
      // Calculate for selected day
      const selectedDate = new Date(employee.selectedDay);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const tasksForDay = employeeTasks.filter(t => {
        const taskDate = new Date(t.dueDate);
        return taskDate >= selectedDate && taskDate < nextDay;
      });
      
      const completedForDay = tasksForDay.filter(t => t.completed).length;
      employee.yearlyCompletion = tasksForDay.length > 0 ? Math.round((completedForDay / tasksForDay.length) * 100) : 0;
    } else if (employee.selectedPeriod === 'monthly' && employee.selectedMonth) {
      // Calculate for selected month
      const selectedDate = new Date(employee.selectedMonth);
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      const tasksForMonth = employeeTasks.filter(t => {
        const taskDate = new Date(t.dueDate);
        return taskDate >= startOfMonth && taskDate <= endOfMonth;
      });
      
      const completedForMonth = tasksForMonth.filter(t => t.completed).length;
      employee.monthlyCompletion = tasksForMonth.length > 0 ? Math.round((completedForMonth / tasksForMonth.length) * 100) : 0;
    }
  }

  // Get completion for display based on selected period
  getDisplayCompletion(employee: EmployeeCard): number {
    switch (employee.selectedPeriod) {
      case 'weekly':
        return employee.weeklyCompletion;
      case 'monthly':
        return employee.monthlyCompletion;
      case 'yearly':
        return employee.yearlyCompletion;
      default:
        return employee.monthlyCompletion;
    }
  }

  // Get period label for display
  getPeriodLabel(employee: EmployeeCard): string {
    switch (employee.selectedPeriod) {
      case 'weekly':
        return 'This Week';
      case 'monthly':
        if (employee.selectedMonth) {
          return new Date(employee.selectedMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return 'This Month';
      case 'yearly':
        if (employee.selectedDay) {
          return new Date(employee.selectedDay).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return 'Select Date';
      default:
        return 'This Month';
    }
  }

  // Get months for selection (last 12 months) - cached
  private _availableMonths: { value: string; label: string }[] | null = null;
  
  getAvailableMonths(): { value: string; label: string }[] {
    if (this._availableMonths) {
      return this._availableMonths;
    }
    
    const months: { value: string; label: string }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    
    this._availableMonths = months;
    return months;
  }

  // Get days for current month selection - cached
  private _availableDays: { value: string; label: string }[] | null = null;
  
  getAvailableDays(): { value: string; label: string }[] {
    if (this._availableDays) {
      return this._availableDays;
    }
    
    const days: { value: string; label: string }[] = [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      });
    }
    
    this._availableDays = days;
    return days;
  }

// Task approval methods
  async approveTask(task: Task): Promise<void> {
    this.apiService.approveTaskCompletion(task.id).subscribe({
      next: () => {
        this.showToast('Task approved successfully');
        this.taskService.loadTasks();
      },
      error: () => {
        this.showToast('Failed to approve task');
      }
    });
  }

  async denyTask(task: Task): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Deny Task Completion',
      message: 'Are you sure you want to deny this task completion? The task will be marked as pending again.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Deny', 
          handler: () => {
            this.apiService.denyTaskCompletion(task.id).subscribe({
              next: () => {
                this.showToast('Task denied');
                this.taskService.loadTasks();
              },
              error: () => {
                this.showToast('Failed to deny task');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Export analytics
  async exportAnalytics(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: 'Export Analytics',
      buttons: [
        {
          text: 'Daily Report',
          handler: () => this.downloadExport('daily')
        },
        {
          text: 'Weekly Report',
          handler: () => this.downloadExport('weekly')
        },
        {
          text: 'Monthly Report',
          handler: () => this.downloadExport('monthly')
        },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  private async downloadExport(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      // Generate CSV content
      let csvContent = 'Employee,Total Tasks,Completed,Pending,Completion Rate\n';
      
      this.employeeCards.forEach(emp => {
        let rate = 0;
        if (period === 'daily') rate = emp.dailyCompletion;
        else if (period === 'weekly') rate = emp.weeklyCompletion;
        else rate = emp.monthlyCompletion;
        
        csvContent += `${emp.name},${emp.totalTasks},${emp.completedTasks},${emp.pendingTasks},${rate}%\n`;
      });
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.showToast(`${period.charAt(0).toUpperCase() + period.slice(1)} report exported`);
    } catch (error) {
      this.showToast('Failed to export report');
    }
  }

   ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          // Only calculate employee cards if tasks are already loaded
          if (this.tasks.length > 0) {
            this.calculateEmployeeCards();
          }
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
    const employees = this.users.filter(u => u.role === 'employee' || !u.role);
    
    if (employees.length === 0) {
      this.showToast('No employees available');
      return;
    }

    // First, select the employee
    const employeeActionSheet = await this.actionSheetController.create({
      header: 'Select Employee to Reassign Task To:',
      buttons: [
        ...employees.map(emp => ({
          text: emp.name,
          handler: async () => {
            // After selecting employee, ask for due date
            const dueDateActionSheet = await this.actionSheetController.create({
              header: 'Select New Due Date:',
              buttons: [
                {
                  text: 'Today',
                  handler: () => {
                    this.createReassignedTask(task, emp.id, new Date());
                  }
                },
                {
                  text: 'Tomorrow',
                  handler: () => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    this.createReassignedTask(task, emp.id, tomorrow);
                  }
                },
                {
                  text: 'Next Week',
                  handler: () => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    this.createReassignedTask(task, emp.id, nextWeek);
                  }
                },
                {
                  text: 'Custom Date',
                  handler: async () => {
                    // Use native date picker via prompt
                    const prompt = await this.alertController.create({
                      header: 'Enter Due Date',
                      message: 'Enter the due date (YYYY-MM-DD):',
                      inputs: [
                        {
                          name: 'date',
                          type: 'date',
                          value: new Date().toISOString().split('T')[0]
                        }
                      ],
                      buttons: [
                        {
                          text: 'Cancel',
                          role: 'cancel'
                        },
                        {
                          text: 'Confirm',
                          handler: (data) => {
                            if (data.date) {
                              this.createReassignedTask(task, emp.id, new Date(data.date));
                            }
                          }
                        }
                      ]
                    });
                    await prompt.present();
                  }
                },
                { text: 'Cancel', icon: 'close', role: 'cancel' }
              ]
            });
            await dueDateActionSheet.present();
          }
        })),
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ]
    });
    
    await employeeActionSheet.present();
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
   // await this.popoverController.dismiss();
    this.authService.logout();
    this.navController.navigateRoot('/login');
  }

  async navigateToProfile(): Promise<void> {
   // await this.popoverController.dismiss();
    this.navController.navigateForward('/profile');
  }

  async navigateToEmployeeTasks(filter: string): Promise<void> {
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

  getEmployeeAvatarUrl(avatar?: string): string {
    if (!avatar) return '';
    if (avatar.startsWith('http') || avatar.startsWith('https')) {
      return avatar;
    }
    return `https://ecg.codepps.online/storage/${avatar}`;
  }

  getEmployeeInitialsByName(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  }

  getPendingApprovalTasks(): Task[] {
    return this.tasks.filter(t => t.pendingApproval === true);
  }

  async exportEmployeeReport(employeeId: string): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: 'Export Employee Report',
      buttons: [
        {
          text: 'Daily Report',
          handler: () => this.downloadEmployeeReport(employeeId, 'daily')
        },
        {
          text: 'Weekly Report',
          handler: () => this.downloadEmployeeReport(employeeId, 'weekly')
        },
        {
          text: 'Monthly Report',
          handler: () => this.downloadEmployeeReport(employeeId, 'monthly')
        },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  private async downloadEmployeeReport(employeeId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    const employee = this.employeeCards.find(e => e.id === employeeId);
    if (!employee) return;

    // Get the tasks for this employee
    const employeeTasks = this.tasks.filter(t => t.employeeId === employeeId);
    const completed = employeeTasks.filter(t => t.completed).length;
    const pending = employeeTasks.filter(t => !t.completed).length;

    // Generate CSV content
    let csvContent = `Report for ${employee.name}\n`;
    csvContent += `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}\n`;
    csvContent += `Date Generated: ${new Date().toLocaleDateString()}\n\n`;
    csvContent += `Task Title,Description,Priority,Due Date,Status\n`;
    
    employeeTasks.forEach(task => {
      csvContent += `"${task.title}","${task.description}","${task.priority}","${new Date(task.dueDate).toLocaleDateString()}","${task.completed ? 'Completed' : 'Pending'}"\n`;
    });

    csvContent += `\nSummary:\n`;
    csvContent += `Total Tasks,${employeeTasks.length}\n`;
    csvContent += `Completed,${completed}\n`;
    csvContent += `Pending,${pending}\n`;

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = (window as any).URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${employee.name.replace(/\s+/g, '_')}_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    (window as any).URL.revokeObjectURL(url);

    this.showToast(`${period.charAt(0).toUpperCase() + period.slice(1)} report exported for ${employee.name}`);
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

  async viewEmployeeTasks(employee: EmployeeCard): Promise<void> {
    try {
      // Dismiss any open popover first
      const popover = await this.popoverController.getTop();
      if (popover) {
        await popover.dismiss();
      }
    } catch (error) {
      // Ignore - popover may not exist
    }
    
    // Navigate to employee tasks page with filter parameter
    // First, let's try to get the employee's user ID from the users array
    const user = this.users.find(u => u.id === employee.id);
    if (user) {
      await this.navController.navigateForward('/employee-tasks', {
        queryParams: { filter: 'all', employeeId: user.id }
      });
    } else {
      // Fallback: navigate without employeeId
      await this.navController.navigateForward('/employee-tasks', {
        queryParams: { filter: 'all' }
      });
    }
  }

}
