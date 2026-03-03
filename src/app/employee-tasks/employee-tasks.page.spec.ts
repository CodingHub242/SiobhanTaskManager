import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeTasksPage } from './employee-tasks.page';

describe('EmployeeTasksPage', () => {
  let component: EmployeeTasksPage;
  let fixture: ComponentFixture<EmployeeTasksPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EmployeeTasksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
