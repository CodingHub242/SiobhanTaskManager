import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonChip, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, documentText, chevronForward, checkmarkCircle, time } from 'ionicons/icons';
import { Task, TaskReport } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from '../services/task.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-task-modal',
  templateUrl: './task-modal.page.html',
  styleUrls: ['./task-modal.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonChip, IonIcon, IonSpinner, CommonModule, FormsModule]
})
export class TaskModalPage implements OnInit {
  @Input() mode: 'add' | 'edit' | 'view' = 'add';
  @Input() task?: Task;
  @Input() selectedDate?: Date;
  @Input() users: User[] = [];

  title: string = '';
  description: string = '';
  priority: 'low' | 'medium' | 'high' = 'medium';
  dueDate: string = '';
  assignedTo: string = '';
  isLoading: boolean = false;
  reports: TaskReport[] = [];
  isAdmin: boolean = false;

  constructor(private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private apiService: ApiService,
    private taskService: TaskService) {
      addIcons({close, documentText, chevronForward, checkmarkCircle, time});
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      this.isAdmin = currentUser?.role === 'admin';
  }

  ngOnInit() {
    if ((this.mode === 'edit' || this.mode === 'view') && this.task) {
      this.title = this.task.title;
      this.description = this.task.description;
      this.priority = this.task.priority;
      this.dueDate = new Date(this.task.dueDate).toISOString().split('T')[0];
      this.assignedTo = this.task.employeeId || '';
    } else if (this.selectedDate) {
      this.dueDate = new Date(this.selectedDate).toISOString().split('T')[0];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.dueDate = tomorrow.toISOString().split('T')[0];
    }

    // Fetch task reports if in view or edit mode
    if ((this.mode === 'edit' || this.mode === 'view') && this.task) {
      this.loadTaskReports();
    }
  }

  loadTaskReports(): void {
    if (!this.task) return;
    
    this.apiService.getTaskReports(this.task.id).subscribe({
      next: (reports: any) => {
        this.reports = (reports || []).map((r: any) => ({
          id: r.id?.toString() || '',
          taskId: r.task_id || this.task!.id,
          description: r.description || '',
          imageUrl: r.image_url || r.image || undefined,
          imagePath: r.image_path || undefined,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          submittedBy: r.submitted_by || undefined
        }));
      },
      error: () => {
        this.reports = [];
      }
    });
  }

  getReportImageUrl(report: TaskReport): string {
    if (report.imageUrl) {
      if (report.imageUrl.startsWith('http')) {
        return report.imageUrl;
      }
      return `https://ecg.codepps.online/storage/${report.imageUrl}`;
    }
    return '';
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  async showError(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showReportDetails(report: TaskReport): Promise<void> {
    const imageUrl = this.getReportImageUrl(report);
    
    const alert = await this.alertController.create({
      header: 'Task Report',
      message: report.description,
      buttons: [
        { text: 'Close', role: 'cancel' }
      ]
    });

    if (imageUrl) {
      const dateStr = report.createdAt.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
      alert.message = `
        <p>${report.description}</p>
        <p><small>Submitted: ${dateStr}</small></p>
        <img src="${imageUrl}" style="max-width: 100%; margin-top: 10px; border-radius: 8px;" />
      `;
    }

    await alert.present();
  }

  async viewReport(report: TaskReport): Promise<void> {
    await this.showReportDetails(report);
  }

  save(): void {
    if (!this.title.trim()) {
      this.showError('Please enter a task title');
      return;
    }

    this.isLoading = true;

    const taskData: any = {
      title: this.title.trim(),
      description: this.description.trim(),
      priority: this.priority,
      dueDate: new Date(this.dueDate),
      completed: this.task?.completed || false
    };

    // Only include employee_id if an employee is selected
    if (this.assignedTo) {
      taskData.employee_id = this.assignedTo;
    }

    const request = this.mode === 'edit' && this.task
      ? this.taskService.updateTask(this.task.id, taskData)
      : this.taskService.addTask(taskData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.modalController.dismiss({ success: true });
      },
      error: (error) => {
        this.isLoading = false;
        const errorMsg = error.error?.errors || error.errors || 'Failed to save task';
        this.showError(errorMsg);
      }
    });
  }

  getEmployeeName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  }

  getReportCount(): number {
    return this.reports.length;
  }

  hasReports(): boolean {
    return this.reports.length > 0;
  }
}
