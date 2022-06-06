import { ComponentFixture, TestBed } from '@angular/core/testing';

import { D3VisComponent } from './d3-vis.component';

describe('D3VisComponent', () => {
  let component: D3VisComponent;
  let fixture: ComponentFixture<D3VisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ D3VisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(D3VisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
