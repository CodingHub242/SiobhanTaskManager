import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonicModule]
})
export class LoginPage implements OnInit {
 email: string = '';
  password: string = '';
  isLoading: boolean = false;
  showerror:any;
  hasError: boolean = false;

  constructor( private authService: AuthService,
    private navController: NavController,
    private toastController: ToastController) {
      addIcons({})
     }

  ngOnInit() {
  }

   async login(): Promise<void> {
    if (!this.email || !this.password) {
      this.showToast('Please enter email and password');
      return;
    }

    this.isLoading = true;

    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.hasError = false;
          this.navigateToDashboard();
        },
        error: (error) => {
          this.isLoading = false;
          this.hasError = true;
          this.showerror = '';
          this.showerror = error.error.errors || 'Login failed';
          this.showToast('Invalid credentials');

           setTimeout(() => {
            this.showerror = '';
          }, 3000);
        }
      });
  }

  navigateToRegister(): void {
    this.navController.navigateForward('/register');
  }

    private navigateToDashboard(): void {
    if (this.authService.isAdmin()) {
      this.navController.navigateRoot('/admin-dashboard');
    } else {
      this.navController.navigateRoot('/employee-dashboard');
    }
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }

}
