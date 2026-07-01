import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Rastreabilidade } from './rastreabilidade.js';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Rastreabilidade', () => {
  let component: Rastreabilidade;
  let fixture: ComponentFixture<Rastreabilidade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rastreabilidade, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Rastreabilidade);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com modoResultado falso', () => {
    expect(component.modoResultado()).toBeFalsy();
  });

  it('deve atualizar o termo de busca ao digitar', () => {
    const event = { target: { value: 'LOT-123' } } as unknown as Event;
    component.aoDigitar(event);
    expect(component.termoPesquisa()).toBe('LOT-123');
  });
});
