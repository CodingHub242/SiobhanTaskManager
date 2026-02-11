import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-day-tasks-modal',
  templateUrl: './day-tasks-modal.page.html',
  styleUrls: ['./day-tasks-modal.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class DayTasksModalPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
