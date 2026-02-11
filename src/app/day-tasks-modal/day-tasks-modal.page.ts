import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonCheckbox, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, calendarOutline, chevronForward } from 'ionicons/icons';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';

@Component({
  selector: 'app-day-tasks-modal',
  templateUrl: './day-tasks-modal.page.html',
  styleUrls: ['./day-tasks-modal.page.scss'],
  standalone: true,
  imports: [IonCheckbox, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonList, IonItem, IonLabel, IonIcon, CommonModule, FormsModule]
})
export class DayTasksModalPage implements OnInit {
  @Input() selectedDate: Date = new Date();
  @Input() tasks: Task[] = [];
  @Input() users: User[] = [];

  // Summary stats
  completedCount: number = 0;
  pendingCount: number = 0;
  overdueCount: number = 0;

  constructor(private modalController: ModalController) { 
    addIcons({close, calendarOutline, chevronForward});
  }

  ngOnInit() {
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
}
