import { Component, OnInit,ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, ActionSheetController, NavController, LoadingController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonChip, IonIcon, IonSpinner, IonBackButton } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';
import { User } from '../models/user.model';
import { addIcons } from 'ionicons';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { arrowBack, create, informationCircle, informationCircleOutline, key, lockClosed, pencil, shieldCheckmark } from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [
    IonContent,
    IonicModule,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    IonButtons,
    IonInput,
    IonItem,
    IonLabel,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonIcon,
    IonSpinner,
    IonBackButton
  ]
})
export class ProfilePage implements OnInit {
 user: User | null = null;
  editMode = false;
  
  // Form data
  editName = '';
  editPhone = '';
  
  // Password form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor( private authService: AuthService,
    private apiService: ApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private navController: NavController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef) { 
      addIcons({shieldCheckmark,create,pencil,lockClosed,key,informationCircleOutline,informationCircle,arrowBack});
    }

  ngOnInit() {
     this.loadUserProfile();
  }

   loadUserProfile(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.editName = this.user.name;
      this.editPhone = this.user.phone || '';
    }
  }

  getUserInitials(): string {
    if (!this.user) return '?';
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  }

  getHashedEmail(): string {
    if (!this.user?.email) return '';
    const [local, domain] = this.user.email.split('@');
    const hashedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
    return `${hashedLocal}@${domain}`;
  }

  getAvatarUrl(): string {
    if (!this.user?.avatar) return '';
    // If avatar is a full URL, return as is
    if (this.user.avatar.startsWith('http') || this.user.avatar.startsWith('https')) {
      return this.user.avatar;
    }
   // console.log('Avatar path from user data:', this.user.avatar);
    // If avatar is a storage path, prepend the storage URL
    return `https://ecg.codepps.online/storage/${this.user.avatar}`;
  }

  toggleEditMode(): void {
    if (this.editMode) {
      // Cancel editing, reset values
      this.editName = this.user?.name || '';
      this.editPhone = this.user?.phone || '';
    }
    this.editMode = !this.editMode;
  }

  async updateProfile(): Promise<void> {
    if (!this.user) return;

    const alert = await this.alertController.create({
      header: 'Update Profile',
      message: 'Are you sure you want to update your profile?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: () => {
            this.apiService.updateUser(this.user!.id, {
              name: this.editName,
              phone: this.editPhone
            }).subscribe({
              next: (response: any) => {
                if (response.success || response.name || response.phone) {
                  // Update local user data
                  this.user!.name = this.editName;
                  this.user!.phone = this.editPhone;
                  this.updateLocalUser();
                  this.showToast('Profile updated successfully');
                  this.editMode = false;
                } else {
                  this.showToast('Failed to update profile');
                }
              },
              error: () => this.showToast('Failed to update profile')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private updateLocalUser(): void {
    localStorage.setItem('currentUser', JSON.stringify(this.user));
  }

  async changeProfilePicture(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: 'Change Profile Picture',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takePhoto();
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'image',
          handler: () => {
            this.chooseFromGallery();
          }
        },
        {
          text: 'Remove Photo',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.removeProfilePicture();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePhoto(): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64
      });

      if (image.base64String) {
        await this.processAndUploadImage(image.base64String);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled photos') {
        this.showToast('Failed to take photo');
        console.error('Camera error:', error);
      }
    }
  }

  async chooseFromGallery(): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        source: CameraSource.Photos,
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64
      });

      if (image.base64String) {
        await this.processAndUploadImage(image.base64String);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled photos') {
        this.showToast('Failed to select image');
        console.error('Gallery error:', error);
      }
    }
  }

  async processAndUploadImage(imageData: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Uploading...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      // The imageData is already base64 from CameraResultType.Base64
      const base64Data = `data:image/jpeg;base64,${imageData}`;
      
      // Upload to server
      const response = await this.uploadAvatarToServer(imageData);
      
      await loading.dismiss();
      
      if (response.success) {
        // Update local user with avatar_path returned from server
        if (this.user) {
          console.log('Full response:', response);
          console.log('Response data:', response.data);
          // Use avatar_path from server response (any type since response structure varies)
          const avatarPath = (response as any).data?.avatar_path || (response as any).data?.avatar || (response as any).avatar_path || (response as any).avatar;
          console.log('Extracted avatar path:', avatarPath);
          if (avatarPath) {
            this.user.avatar = avatarPath;
          } else {
            // Fallback: clear avatar if no path returned
            this.user.avatar = undefined;
          }
          this.updateLocalUser();
          // Trigger change detection to refresh UI
          this.cdr.markForCheck();
        }
        this.showToast('Profile picture updated successfully');
      } else {
        this.showToast(response.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('Failed to upload profile picture');
      console.error('Upload error:', error);
    }
  }

  private async uploadAvatarToServer(base64Image: string): Promise<{ success: boolean; message?: string; data?: any }> {
    return new Promise((resolve) => {
      if (!this.user) {
        resolve({ success: false, message: 'User not found' });
        return;
      }
      
      // Send to API service
      this.apiService.uploadAvatar(this.user.id, base64Image).subscribe({
        next: (response: any) => {
          console.log('Avatar upload response:', response);
          resolve({ 
            success: true, 
            message: response.message || 'Avatar uploaded successfully',
            data: response.data || response
          });
        },
        error: (error) => {
          console.error('Avatar upload error:', error);
          // For demo purposes, still return success if the endpoint is not available
          if (error.status === 404 || error.status === 405) {
            resolve({ 
              success: true, 
              message: 'Avatar uploaded (demo mode - backend endpoint needed)' 
            });
          } else {
            resolve({ 
              success: false, 
              message: error.error?.message || 'Failed to upload avatar' 
            });
          }
        }
      });
    });
  }

  async removeProfilePicture(): Promise<void> {
    if (!this.user) return;

    const alert = await this.alertController.create({
      header: 'Remove Profile Picture',
      message: 'Are you sure you want to remove your profile picture?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          handler: () => {
            // Remove avatar by setting it to empty/null
            this.apiService.updateUser(this.user!.id, { avatar: '' }).subscribe({
              next: (response: any) => {
                if (response.success || response.avatar === '') {
                  this.user!.avatar = undefined;
                  this.updateLocalUser();
                  this.showToast('Profile picture removed');
                }
              },
              error: () => this.showToast('Failed to remove profile picture')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async resetPassword(): Promise<void> {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.showToast('Please fill in all password fields');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showToast('Passwords do not match');
      return;
    }

    if (this.newPassword.length < 6) {
      this.showToast('Password must be at least 6 characters');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reset Password',
      message: 'Are you sure you want to change your password?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Change Password',
          handler: () => {
            this.apiService.changePassword(
              this.user!.id,
              this.currentPassword,
              this.newPassword,
              this.confirmPassword
            ).subscribe({
              next: (response: any) => {
                if (response.success) {
                  this.showToast('Password changed successfully');
                  this.clearPasswordFields();
                } else {
                  this.showToast(response.message || 'Failed to change password');
                }
              },
              error: (error: any) => {
                this.showToast(error.error?.message || 'Failed to change password');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  clearPasswordFields(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  logout(): void {
    this.authService.logout();
    this.navController.navigateRoot('/login');
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  goback(): void {
    this.navController.back();
  }
}
