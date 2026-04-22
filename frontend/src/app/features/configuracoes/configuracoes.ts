import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ConfiguracoesService, ComparacaoPeriodo, ProducaoPeriodo } from '../../core/services/configuracoes.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css',
})
export class Configuracoes {
  private configuracoesService = inject(ConfiguracoesService);

  // Settings Signals
  settings = this.configuracoesService.settings;

  // Dashboard Options
  periodoOptions: { value: ComparacaoPeriodo; label: string }[] = [
    { value: 'qualquer_momento', label: 'Qualquer Momento' },
    { value: 'mes', label: 'Mês' },
    { value: 'semana', label: 'Semana' },
    { value: 'dia', label: 'Dia' }
  ];

  // Lote Options
  producaoOptions: { value: ProducaoPeriodo; label: string }[] = [
    { value: 'qualquer_momento', label: 'Qualquer Momento' },
    { value: 'mes', label: 'Mês' },
    { value: 'semana', label: 'Semana' },
    { value: 'dia', label: 'Dia' }
  ];

  updateDashboard(key: string, value: any) {
    this.configuracoesService.updateDashboardSettings({ [key]: value });
  }

  updateLote(key: string, value: any) {
    this.configuracoesService.updateLoteSettings({ [key]: value });
  }

  onNumericInput(key: string, target: any, section: 'dashboard' | 'lote') {
    const val = parseFloat(target.value);
    if (!isNaN(val)) {
      if (section === 'dashboard') {
        this.updateDashboard(key, val);
      } else {
        this.updateLote(key, val);
      }
    }
  }
}
