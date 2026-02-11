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
    path: 'day-tasks-modal',
    loadComponent: () => import('./day-tasks-modal/day-tasks-modal.page').then( m => m.DayTasksModalPage)
  },
  {
    path: 'task-modal',
    loadComponent: () => import('./task-modal/task-modal.page').then( m => m.TaskModalPage)
  },
  
];
