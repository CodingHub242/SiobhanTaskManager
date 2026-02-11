import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DayTasksModalPage } from './day-tasks-modal.page';

describe('DayTasksModalPage', () => {
  let component: DayTasksModalPage;
  let fixture: ComponentFixture<DayTasksModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DayTasksModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
