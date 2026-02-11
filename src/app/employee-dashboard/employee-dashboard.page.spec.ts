import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeDashboardPage } from './employee-dashboard.page';

describe('EmployeeDashboardPage', () => {
  let component: EmployeeDashboardPage;
  let fixture: ComponentFixture<EmployeeDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmployeeDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
