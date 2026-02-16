import { Component, Input,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Task } from '../models/task.model';
import { addIcons } from 'ionicons';
import { ApiService } from '../services/api.service';
import { closeCircle } from 'ionicons/icons';

@Component({
  selector: 'app-task-report-modal',
  templateUrl: './task-report-modal.page.html',
  styleUrls: ['./task-report-modal.page.scss'],
  standalone: true,
  imports: [
    //IonContent, 
    // IonHeader, 
    // IonTitle,
    IonicModule, 
    //IonToolbar, 
    CommonModule, FormsModule]
})
export class TaskReportModalPage implements OnInit {
 @Input() task!: Task;
  
  description: string = '';
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  isUploading: boolean = false;
 
   constructor(
    private modalController: ModalController,
    private apiService: ApiService,
    private toastController: ToastController
  ) {
    addIcons({closeCircle});
  }

  ngOnInit() {
  }

  triggerFileInput(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];
      
      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

   async uploadReport(): Promise<void> {
    if (!this.description.trim()) {
      this.showToast('Please enter a description');
      return;
    }

    this.isUploading = true;

    try {
      if (this.selectedImage) {
        await this.apiService.uploadTaskReport(
          this.task.id,
          this.description,
          this.selectedImage
        ).toPromise();
      }
      
      this.showToast('Report uploaded successfully');
      this.modalController.dismiss({ success: true });
    } catch (error) {
      this.showToast('Failed to upload report');
    } finally {
      this.isUploading = false;
    }
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: message.includes('success') ? 'success' : 'danger'
    });
    await toast.present();
  }

}
