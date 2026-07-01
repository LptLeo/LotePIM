import { Injectable, signal, computed } from '@angular/core';

// === ENUMS DE PERÍODO ===

export enum PeriodoComparacao {
  qualquer_momento = 'Qualquer Momento',
  mes = 'Mês',
  semana = 'Semana',
  dia = 'Dia',
}

export type ComparacaoPeriodo = keyof typeof PeriodoComparacao;

export enum PeriodoProducao {
  qualquer_momento = 'Qualquer Momento',
  mes = 'Mês',
  semana = 'Semana',
  dia = 'Dia',
}

export type ProducaoPeriodo = keyof typeof PeriodoProducao;

// === INTERFACES ===

export interface DashboardSettings {
  lotesComparacao: ComparacaoPeriodo;
  unidadesComparacao: ComparacaoPeriodo;
  taxaAprovacaoAlvo: number;
}

export interface LoteSettings {
  producaoTotalPeriodo: ProducaoPeriodo;
  atividadeTempoRealBase: number;
}

export interface AppSettings {
  dashboard: DashboardSettings;
  lote: LoteSettings;
}

// === CONFIGURAÇÕES PADRÃO ===

const PADRAO: AppSettings = {
  dashboard: {
    lotesComparacao: 'mes',
    unidadesComparacao: 'mes',
    taxaAprovacaoAlvo: 90,
  },
  lote: {
    producaoTotalPeriodo: 'qualquer_momento',
    atividadeTempoRealBase: 5,
  },
};

@Injectable({
  providedIn: 'root',
})
export class ConfiguracoesService {
  private readonly STORAGE_KEY = 'lote_pim_settings';

  // === ESTADO ===

  public settings = signal<AppSettings>(this.carregarSettings());

  public dashboardSettings = computed(() => this.settings().dashboard);
  public loteSettings = computed(() => this.settings().lote);

  // === MÉTODOS PÚBLICOS ===

  public saveSettings(novo: AppSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(novo));
    this.settings.set(novo);
  }

  public updateDashboardSettings(dashboard: Partial<DashboardSettings>): void {
    const atual = this.settings();
    this.saveSettings({
      ...atual,
      dashboard: { ...atual.dashboard, ...dashboard },
    });
  }

  public updateLoteSettings(lote: Partial<LoteSettings>): void {
    const atual = this.settings();
    this.saveSettings({
      ...atual,
      lote: { ...atual.lote, ...lote },
    });
  }

  // === MÉTODOS PRIVADOS ===

  private carregarSettings(): AppSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return PADRAO;
    try {
      return { ...PADRAO, ...JSON.parse(stored) };
    } catch {
      return PADRAO;
    }
  }
}
