import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard.js';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../core/services/auth.service.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let mockAuthService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockAuthService = {
      usuario: signal({ id: 1, nome: 'Teste' }),
    };

    mockConfigService = {
      settings: signal({
        dashboard: {
          lotesComparacao: 'mes',
          unidadesComparacao: 'mes',
          taxaAprovacaoAlvo: 95,
        },
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfiguracoesService, useValue: mockConfigService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve retornar a classe CSS correta para o status', () => {
    const css = component.getStatusClass('aprovado');
    expect(css).toContain('bg-[#506600]');
  });
});
