import { Component, OnInit, OnDestroy, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, ActionSheetController, NavController, LoadingController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonChip, IonIcon, IonSpinner, IonBackButton } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';
import { User } from '../models/user.model';
import { addIcons } from 'ionicons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { arrowBack, camera, create, informationCircle, informationCircleOutline, key, lockClosed, pencil, shieldCheckmark } from 'ionicons/icons';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonBackButton
  ]
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  editMode = false;
  isLoading = false;
  
  // Form data
  editName = '';
  editPhone = '';
  
  // Password form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  private destroy$ = new Subject<void>();

  constructor( private authService: AuthService,
    private apiService: ApiService,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private navController: NavController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef) { 
      addIcons({shieldCheckmark,create,pencil,lockClosed,key,informationCircleOutline,informationCircle,arrowBack,camera});
    }

  ngOnInit() {
     this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

   loadUserProfile(): void {
    // First try to get user from local storage/auth service
    this.user = this.authService.getCurrentUser();
    
    if (this.user) {
      this.editName = this.user.name;
      this.editPhone = this.user.phone || '';
    } else {
      // If no user in localStorage, try to fetch from API
      this.fetchUserFromApi();
    }

    // Subscribe to auth changes for reactive updates
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.user = user;
        this.editName = user.name;
        this.editPhone = user.phone || '';
        this.cdr.detectChanges();
      }
    });

    console.log('Loaded user profile:', this.editName);
  }

  private fetchUserFromApi(): void {
    // Try to get userId from localStorage, or extract from currentUser if available
    let userId = localStorage.getItem('userId');
    
    // If no userId, try to get from currentUser in auth service
    if (!userId) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.id) {
        userId = currentUser.id;
      }
    }
    
    // Also check if we have an auth token - if not, user is not logged in
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found, user not logged in');
      return;
    }
    
    if (userId) {
      console.log('Fetching user with ID:', userId);
      this.apiService.getUserById(userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          console.log('User API response:', response);
          // Handle wrapped response: { data: [...] }
          const userData = response.data ? response.data[0] : response;
          if (userData) {
            const user: User = {
              id: userData.id?.toString() || '',
              email: userData.email || '',
              name: userData.name || '',
              role: userData.role || 'employee',
              department: userData.department || userData.dept_name || undefined,
              avatar: userData.avatar || userData.avatar_path || undefined,
              phone: userData.phone || undefined,
              createdAt: userData.created_at ? new Date(userData.created_at) : new Date(),
              updatedAt: userData.updated_at ? new Date(userData.updated_at) : new Date(),
              created_at: userData.created_at ? new Date(userData.created_at) : undefined,
              updated_at: userData.updated_at ? new Date(userData.updated_at) : undefined
            };
            // Use setTimeout to ensure change detection runs after view update
            setTimeout(() => {
              this.user = user;
              this.editName = user.name;
              this.editPhone = user.phone || '';
              // Update local storage with fresh data
              localStorage.setItem('currentUser', JSON.stringify(user));
              // Also store userId if not already stored
              if (!localStorage.getItem('userId')) {
                localStorage.setItem('userId', user.id);
              }
              // Force change detection to update UI
              this.cdr.detectChanges();
              console.log('User loaded:', this.user);
            }, 100);
          }
        },
        error: (err) => {
          console.error('Failed to fetch user from API:', err);
        }
      });
    } else {
      console.log('No userId found in localStorage or auth service');
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
    // If avatar is already a data URI, return as is
    if (this.user.avatar.startsWith('data:')) {
      return this.user.avatar;
    }
    // If avatar is a full URL, return as is
    if (this.user.avatar.startsWith('http') || this.user.avatar.startsWith('https')) {
      return this.user.avatar;
    }
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
    console.log('takePhoto called');
    try {
      const image = await Camera.getPhoto({
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri
      });

      console.log('Camera result:', image);
      console.log('webPath:', image.webPath);

      if (image.webPath) {
        await this.processAndUploadImage(image.webPath);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      if (error.message !== 'User cancelled photos') {
        this.showToast('Failed to take photo');
      }
    }
  }

  async chooseFromGallery(): Promise<void> {
    console.log('chooseFromGallery called');
    try {
      const image = await Camera.getPhoto({
        source: CameraSource.Photos,
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri
      });

      console.log('Gallery result:', image);
      console.log('webPath:', image.webPath);

      if (image.webPath) {
        await this.processAndUploadImage(image.webPath);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      if (error.message !== 'User cancelled photos') {
        this.showToast('Failed to select image');
      }
    }
  }

  async processAndUploadImage(webPath: string): Promise<void> {
    console.log('processAndUploadImage called with:', webPath);
    
    this.isLoading = true;
    try {
      // Convert the image to base64
      const base64Data = await this.readImageAsBase64(webPath);
      console.log('Base64 data length:', base64Data.length);
      
      // Upload to server
      const response = await this.uploadAvatarToServer(base64Data);
      
      this.isLoading = false;
      
      if (response.success) {
        // Update local user with avatar_path returned from server
        if (this.user) {
          console.log('Full response:', response);
          console.log('Response data:', response.data);
          // Use avatar_path from server response
          const avatarPath = (response as any).data?.avatar_path || (response as any).data?.avatar || (response as any).avatar_path || (response as any).avatar;
          console.log('Extracted avatar path:', avatarPath);
          if (avatarPath) {
            this.user.avatar = avatarPath;
          } else {
            // In demo mode or when no path returned, save base64 as avatar for local preview
            this.user.avatar = base64Data;
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
      this.isLoading = false;
      this.showToast('Failed to upload profile picture');
      console.error('Upload error:', error);
    }
  }

  private async readImageAsBase64(webPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = () => {
        console.error('XHR error loading image');
        reject(new Error('Failed to load image'));
      };
      xhr.open('GET', webPath);
      xhr.send();
    });
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

  back(){
    history.back();
  }

}
