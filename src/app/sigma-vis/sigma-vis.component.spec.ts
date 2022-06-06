import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SigmaVisComponent } from './sigma-vis.component';

describe('SigmaVisComponent', () => {
  let component: SigmaVisComponent;
  let fixture: ComponentFixture<SigmaVisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SigmaVisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SigmaVisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
