import { Component, inject, computed } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardService } from "./services/dashboard.service";
import { DatePipe } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, PageHeaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private dashboardService = inject(DashboardService);

  dashboardResource = rxResource({
    stream: () => this.dashboardService.getDashboardData(),
  });

  lotesProduzidos = computed(() => this.dashboardResource.value()?.lotes_hoje ?? 0);
  unidadesProduzidas = computed(() => this.dashboardResource.value()?.unidades_hoje ?? 0);
  taxaDeAprovacaoMes = computed(() => this.dashboardResource.value()?.taxa_aprovacao_mes ?? 0);
  lotesEmAberto = computed(() => this.dashboardResource.value()?.aguardando_inspecao ?? 0);
  ultimosLotes = computed(() => this.dashboardResource.value()?.ultimos_lotes ?? []);

  getStatusClass(status: string): string {
    const base = 'ml-auto h-[20px] text-center rounded-xs py-0.5 px-2 font-bold text-[10.4px] tracking-[0.52px] flex items-center justify-center ';

    switch (status) {
      case 'aprovado':
        return base + 'bg-[#506600] border border-[#C3F400]/20 text-[#EFFFBC] w-[78.06px]';
      case 'aguardando_inspecao':
        return base + 'bg-[#EAB308]/10 border border-[#EAB308]/20 text-[#EAB308] w-[160px]';
      case 'reprovado':
        return base + 'bg-[#DC2626] border border-[#EF4444] text-[#FFFFFF] w-[84.55px]';
      case 'aprovado_restricao':
        return base + 'bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316] w-[175px]';
      default:
        return base + 'bg-[#201F1F] text-[#ADAAAA] w-[100px]';
    }
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toUpperCase();
  }
}
