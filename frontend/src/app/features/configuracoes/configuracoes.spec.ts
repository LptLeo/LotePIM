import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Configuracoes } from './configuracoes.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { signal, computed } from '@angular/core';

describe('Configuracoes', () => {
  let component: Configuracoes;
  let fixture: ComponentFixture<Configuracoes>;
  let mockConfigService: Partial<ConfiguracoesService>;

  beforeEach(async () => {
    const settingsSignal = signal({
      lote: { producaoTotalPeriodo: 'mes' as const, atividadeTempoRealBase: 5 },
      dashboard: {
        lotesComparacao: 'mes' as const,
        unidadesComparacao: 'mes' as const,
        taxaAprovacaoAlvo: 90,
      },
    });
    mockConfigService = {
      settings: settingsSignal,
      dashboardSettings: computed(() => settingsSignal().dashboard),
      loteSettings: computed(() => settingsSignal().lote),
      updateDashboardSettings: jest.fn(),
      updateLoteSettings: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Configuracoes],
      providers: [{ provide: ConfiguracoesService, useValue: mockConfigService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Configuracoes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
