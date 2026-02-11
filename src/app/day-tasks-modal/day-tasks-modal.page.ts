import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { IonicModule, ModalController } from '@ionic/angular';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';

@Component({
  selector: 'app-day-tasks-modal',
  templateUrl: './day-tasks-modal.page.html',
  styleUrls: ['./day-tasks-modal.page.scss'],
  standalone: true,
  imports: [IonicModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonList, IonItem, IonLabel, CommonModule, FormsModule]
})
export class DayTasksModalPage implements OnInit {
  @Input() selectedDate: Date = new Date();
  @Input() tasks: Task[] = [];
  @Input() users: User[] = [];

  constructor(private modalController: ModalController) { }

  ngOnInit() {
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
