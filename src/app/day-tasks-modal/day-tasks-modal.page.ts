import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonCheckbox, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { IonicModule, ModalController,ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, calendarOutline, chevronForward } from 'ionicons/icons';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from '../services/task.service';
import { TaskModalPage } from '../task-modal/task-modal.page';

@Component({
  selector: 'app-day-tasks-modal',
  templateUrl: './day-tasks-modal.page.html',
  styleUrls: ['./day-tasks-modal.page.scss'],
  standalone: true,
  imports: [IonicModule, 
    //IonCheckbox, 
    //IonList, 
    // IonItem, 
    // IonLabel, 
    CommonModule, FormsModule]
})
export class DayTasksModalPage implements OnInit {
  @Input() selectedDate: Date = new Date();
  @Input() tasks: Task[] = [];
  @Input() users: User[] = [];

  // Summary stats
  completedCount: number = 0;
  pendingCount: number = 0;
  overdueCount: number = 0;

  constructor(private modalController: ModalController,private taskService: TaskService,private toastController: ToastController) { 
    addIcons({close, calendarOutline, chevronForward});
  }

  ngOnInit() {
    // Ensure tasks and users are never null
    if (!this.tasks) {
      this.tasks = [];
    }
    if (!this.users) {
      this.users = [];
    }
    this.calculateSummary();
  }

  calculateSummary(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.completedCount = this.tasks.filter(t => t.completed).length;
    this.pendingCount = this.tasks.filter(t => !t.completed).length;
    this.overdueCount = this.tasks.filter(t => !t.completed && new Date(t.dueDate) < today).length;
  }

  getEmployeeName(employeeId?: string): string {
    if (!employeeId) return 'Unassigned';
    const user = this.users.find(u => u.id === employeeId);
    return user ? user.name : 'Unassigned';
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async onTaskClick(task: Task): Promise<void> {
    await this.modalController.dismiss({ task, action: 'view' });
  }

  // async openTaskModal(task: Task): Promise<void> {
  //   await this.modalController.dismiss({ task, action: 'edit' });
  // }

  //pass @Input selected date to task modal inside the openAddTaskModalWithDate function
  async openAddTaskModalWithDate(): Promise<void> {

    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: { mode: 'add', selectedDate: this.selectedDate, users: this.users }
    });
    
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) {
        this.showToast('Task created successfully');
        this.taskService.loadTasks();
      }
    });
    
    await modal.present();
  }
  // async openAddTaskModalWithDate(date:): Promise<void> {

  //     const modal = await this.modalController.create({
  //       component: TaskModalPage,
  //       componentProps: { mode: 'add', selectedDate: date, users: this.users }
  //     });
      
  //     modal.onDidDismiss().then((result) => {
  //       if (result.data?.success) {
  //         this.showToast('Task created successfully');
  //         this.taskService.loadTasks();
  //       }
  //     });
      
  //     await modal.present();
  //   }

    private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    await toast.present();
  }
}
