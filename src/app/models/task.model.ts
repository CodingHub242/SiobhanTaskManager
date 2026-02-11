export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  completed: boolean;
  employeeId?: string;
  createdAt: Date;
  updatedAt: Date;
  report?: TaskReport;
}

export interface TaskReport {
  id: string;
  taskId: string;
  description: string;
  imageUrl?: string;
  imagePath?: string;
  createdAt: Date;
  submittedBy?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}
