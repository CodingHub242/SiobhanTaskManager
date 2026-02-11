import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-task-report-modal',
  templateUrl: './task-report-modal.page.html',
  styleUrls: ['./task-report-modal.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class TaskReportModalPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
