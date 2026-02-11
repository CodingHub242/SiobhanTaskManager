import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit,OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController,PopoverController,AlertController, ToastController, ActionSheetController, NavController, LoadingController } from '@ionic/angular';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonChip, IonIcon, IonSpinner, IonBackButton } from '@ionic/angular/standalone';
import { Subject, takeUntil } from 'rxjs';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { briefcase,add, trash, create, mail, document, close, eye, download, checkmark, arrowBack, arrowUp, arrowDown, filter, cloudUpload, checkmarkCircle, layers, time, serverOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { TaskModalPage } from '../task-modal/task-modal.page';
import { addIcons } from 'ionicons';
import { TaskReportModalPage } from '../task-report-modal/task-report-modal.page';

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

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.page.html',
  styleUrls: ['./employee-dashboard.page.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [IonicModule,IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class EmployeeDashboardPage implements OnInit {
 tasks: Task[] = [];
  filteredTasks: Task[] = [];
  filter: 'all' | 'completed' | 'pending' = 'all';
  searchTerm: string = '';
  viewMode: 'list' | 'calendar' | 'analytics' = 'list';
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  currentDate: Date = new Date();
  
  // Chart data
  tasksByPriority: ChartData[] = [];
  tasksByStatus: ChartData[] = [];
  weeklyTasks: ChartData[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(  private authService: AuthService,
    private apiService: ApiService,
    private modalController: ModalController,
    private alertController: AlertController,
    private navController: NavController,
    private actionSheetController: ActionSheetController,
    private popoverController: PopoverController,
    private toastController: ToastController) {
       addIcons({briefcase,serverOutline, add, trash, create, mail, document, close, eye, download, checkmark, arrowBack, arrowUp, arrowDown, filter,checkmarkCircle,cloudUpload,layers,time});
  }

  ngOnInit() {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.navController.navigateRoot('/login');
      return;
    }

    this.apiService.getTasksByUser(currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let tasksRaw: any[] = [];
          
          if (response.data && Array.isArray(response.data.data)) {
            tasksRaw = response.data.data;
          } else if (Array.isArray(response.data)) {
            tasksRaw = response.data;
          } else if (Array.isArray(response)) {
            tasksRaw = response;
          }

          const tasks = tasksRaw.map(t => this.transformTask(t));
          this.tasks = tasks;
          this.filterTasksLocal();
          this.generateCalendar();
          this.calculateChartData();
        },
        error: () => {
          this.tasks = [];
          this.filteredTasks = [];
        }
      });
  }

  filterTasksLocal(): void {
    let filtered = this.tasks;

    if (this.filter === 'completed') {
      filtered = this.tasks.filter(t => t.completed);
    } else if (this.filter === 'pending') {
      filtered = this.tasks.filter(t => !t.completed);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(term) || 
        t.description.toLowerCase().includes(term)
      );
    }

    this.filteredTasks = filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  setFilter(filter: 'all' | 'completed' | 'pending'): void {
    this.filter = filter;
    this.filterTasksLocal();
  }

  onSearchChange(): void {
    this.filterTasksLocal();
  }

  // Calendar methods
  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
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

  // Chart data methods
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

    // Tasks by Status
    const completed = (this.tasks || []).filter(t => t.completed).length;
    const pending = (this.tasks || []).filter(t => !t.completed).length;
    this.tasksByStatus = [
      { label: 'Completed', value: completed, color: '#2dd36f' },
      { label: 'Pending', value: pending, color: '#ffce00' }
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

  async toggleTaskCompletion(task: Task): Promise<void> {
    const updated = await this.apiService.updateTask(task.id, { completed: !task.completed }).toPromise();
    if (updated) {
      this.loadTasks();
      const message = !task.completed ? 'Task marked as complete!' : 'Task marked as pending';
      this.showToast(message);
    }
  }

  async openTaskReportModal(task: Task): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskReportModalPage,
      componentProps: { task }
    });
    await modal.present();
  }

  async showTaskOptions(task: Task): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: 'Task Options',
      buttons: [
        {
          text: !task.completed ? 'Mark as Complete' : 'Mark as Pending',
          icon: 'checkmark-circle',
          handler: () => this.toggleTaskCompletion(task)
        },
        {
          text: 'Upload Report',
          icon: 'cloud-upload',
          handler: () => this.openTaskReportModal(task)
        },
        {
          text: 'View Details',
          icon: 'eye',
          handler: () => this.openTaskDetailModal(task)
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async openAddTaskModal(date?: Date): Promise<void> {
    const taskDate = date || this.currentDate;
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'add', selectedDate: taskDate }
    });
    await modal.present();
    
    // Refresh tasks after modal closes
    modal.onDidDismiss().then(() => {
      this.loadTasks();
    });
  }

  async openTaskDetailModal(task: Task): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'view', task }
    });
    await modal.present();
  }

  async logout(): Promise<void> {
    await this.popoverController.dismiss();
    this.authService.logout();
    this.navController.navigateRoot('/login');
  }

  async navigateToProfile(): Promise<void> {
    await this.popoverController.dismiss();
    this.navController.navigateRoot('/profile');
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

  getTotalTasks(): number {
    return this.tasks.length;
  }

  getCompletedTasks(): number {
    return this.tasks.filter(t => t.completed).length;
  }

  getPendingTasks(): number {
    return this.tasks.filter(t => !t.completed).length;
  }

  getProgressPercentage(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.getCompletedTasks() / this.tasks.length) * 100);
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

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }
}
