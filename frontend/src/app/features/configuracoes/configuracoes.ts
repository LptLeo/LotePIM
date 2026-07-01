import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import {
  ConfiguracoesService,
  PeriodoComparacao,
  PeriodoProducao,
  type DashboardSettings,
  type LoteSettings,
} from '../../core/services/configuracoes.service.js';

interface OpcaoSelecao {
  value: string;
  label: string;
}

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css',
})
export class Configuracoes {
  // === INJEÇÃO DE DEPENDÊNCIAS ===

  private configuracoesService = inject(ConfiguracoesService);

  // === ESTADO ===

  public settings = this.configuracoesService.settings;

  // === OPÇÕES DE SELEÇÃO ===

  public periodoOptions: OpcaoSelecao[] = Object.entries(PeriodoComparacao).map(
    ([key, value]) => ({ value: key, label: value }),
  );
  public producaoOptions: OpcaoSelecao[] = Object.entries(PeriodoProducao).map(
    ([key, value]) => ({ value: key, label: value }),
  );

  // === MÉTODOS PÚBLICOS ===

  public atualizarDashboard(key: keyof DashboardSettings, value: string | number): void {
    this.configuracoesService.updateDashboardSettings({ [key]: value });
  }

  public atualizarConfiguracaoLote(
    key: keyof LoteSettings,
    value: string | number,
  ): void {
    this.configuracoesService.updateLoteSettings({ [key]: value });
  }

  public aoDigitarNumero(chave: string, evento: Event, secao: string): void {
    const alvo = evento.target as HTMLInputElement;
    const valor = parseFloat(alvo.value);
    if (isNaN(valor)) return;

    if (secao === 'dashboard') {
      this.configuracoesService.updateDashboardSettings({ [chave]: valor });
    } else {
      this.configuracoesService.updateLoteSettings({ [chave]: valor });
    }
  }
}
