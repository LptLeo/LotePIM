import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rastreabilidade } from './rastreabilidade';

describe('Rastreabilidade', () => {
  let component: Rastreabilidade;
  let fixture: ComponentFixture<Rastreabilidade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rastreabilidade],
    }).compileComponents();

    fixture = TestBed.createComponent(Rastreabilidade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
