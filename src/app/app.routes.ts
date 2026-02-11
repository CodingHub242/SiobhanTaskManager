import { Routes } from '@angular/router';
import { LoginGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage),
    canActivate: [LoginGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then( m => m.RegisterPage),
    canActivate: [LoginGuard]
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.page').then( m => m.AdminDashboardPage)
  },
  {
    path: 'employee-dashboard',
    loadComponent: () => import('./employee-dashboard/employee-dashboard.page').then( m => m.EmployeeDashboardPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then( m => m.ProfilePage)
  },
  // {
  //   path: 'task-report-modal',
  //   loadComponent: () => import('./task-report-modal/task-report-modal.page').then( m => m.TaskReportModalPage)
  // },
  
];
