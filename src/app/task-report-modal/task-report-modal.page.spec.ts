import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskReportModalPage } from './task-report-modal.page';

describe('TaskReportModalPage', () => {
  let component: TaskReportModalPage;
  let fixture: ComponentFixture<TaskReportModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskReportModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
