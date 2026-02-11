import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskModalPage } from './task-modal.page';

describe('TaskModalPage', () => {
  let component: TaskModalPage;
  let fixture: ComponentFixture<TaskModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
