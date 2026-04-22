import { Injectable, signal } from '@angular/core';

export type ComparacaoPeriodo = 'mes' | 'semana' | 'dia' | 'qualquer_momento';
export type ProducaoPeriodo = 'qualquer_momento' | 'mes' | 'semana' | 'dia';

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

const DEFAULT_SETTINGS: AppSettings = {
  dashboard: {
    lotesComparacao: 'mes',
    unidadesComparacao: 'mes',
    taxaAprovacaoAlvo: 90
  },
  lote: {
    producaoTotalPeriodo: 'qualquer_momento',
    atividadeTempoRealBase: 1000
  }
};

@Injectable({
  providedIn: 'root'
})
export class ConfiguracoesService {
  private readonly STORAGE_KEY = 'lote_pim_settings';
  
  settings = signal<AppSettings>(this.loadSettings());

  private loadSettings(): AppSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings: AppSettings) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));
    this.settings.set(newSettings);
  }

  updateDashboardSettings(dashboard: Partial<DashboardSettings>) {
    const current = this.settings();
    const updated = {
      ...current,
      dashboard: { ...current.dashboard, ...dashboard }
    };
    this.saveSettings(updated);
  }

  updateLoteSettings(lote: Partial<LoteSettings>) {
    const current = this.settings();
    const updated = {
      ...current,
      lote: { ...current.lote, ...lote }
    };
    this.saveSettings(updated);
  }
}
