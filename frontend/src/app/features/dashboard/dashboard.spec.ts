import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard.js';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../core/services/auth.service.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let mockAuthService: Partial<AuthService>;
  let mockConfigService: Partial<ConfiguracoesService>;

  beforeEach(async () => {
    const settingsSignal = signal({
      dashboard: {
        lotesComparacao: 'mes' as const,
        unidadesComparacao: 'mes' as const,
        taxaAprovacaoAlvo: 95,
      },
    });
    mockAuthService = {
      usuario: signal({ id: 1, nome: 'Teste', perfil: 'gestor' }),
      podeAbrirLote: computed(() => true),
    };
    mockConfigService = {
      settings: settingsSignal,
      dashboardSettings: computed(() => settingsSignal().dashboard),
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
    const css = component.obterClasseStatus('aprovado');
    expect(css).toContain('bg-[#506600]');
  });
});
