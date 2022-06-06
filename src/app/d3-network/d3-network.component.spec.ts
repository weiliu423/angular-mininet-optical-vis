import { ComponentFixture, TestBed } from '@angular/core/testing';

import { D3NetworkComponent } from './d3-network.component';

describe('D3NetworkComponent', () => {
  let component: D3NetworkComponent;
  let fixture: ComponentFixture<D3NetworkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ D3NetworkComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(D3NetworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
