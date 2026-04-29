import { Component, inject, computed } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardService } from "./services/dashboard.service.js";
import { DashboardData } from './models/dashboard.interface.js';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, PageHeaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private configuracoesService = inject(ConfiguracoesService);
  private authService = inject(AuthService);

  settings = this.configuracoesService.settings;

  // Apenas operadores e gestores podem abrir novos lotes
  podeAbrirLote = computed(() => {
    const perfil = this.authService.usuario()?.perfil;
    return perfil === 'operador' || perfil === 'gestor';
  });

  dashboardResource = rxResource<DashboardData, any>({
    stream: () => this.dashboardService.getDashboardData(
      this.settings().dashboard.lotesComparacao,
      this.settings().dashboard.unidadesComparacao
    ),
  });

  lotesProduzidos = computed(() => this.dashboardResource.value()?.lotes_mes ?? 0);
  lotesTendencia = computed(() => this.dashboardResource.value()?.lotes_tendencia ?? 0);
  unidadesProduzidas = computed(() => this.dashboardResource.value()?.unidades_mes ?? 0);
  unidadesTendencia = computed(() => this.dashboardResource.value()?.unidades_tendencia ?? 0);
  taxaDeAprovacaoMes = computed(() => this.dashboardResource.value()?.taxa_aprovacao_mes ?? 0);
  lotesEmAberto = computed(() => this.dashboardResource.value()?.aguardando_inspecao ?? 0);
  ultimosLotes = computed(() => this.dashboardResource.value()?.ultimos_lotes ?? []);
  dataGeracao = new Date();

  // Dynamic Labels
  lotesLabel = computed(() => {
    const p = this.settings().dashboard.lotesComparacao;
    const map: Record<string, string> = {
      qualquer_momento: 'LOTES (HISTÓRICO)',
      mes: 'LOTES (MÊS ATUAL)',
      semana: 'LOTES (ESTA SEMANA)',
      dia: 'LOTES (HOJE)'
    };
    return map[p] || 'LOTES';
  });

  lotesSublabel = computed(() => {
    const p = this.settings().dashboard.lotesComparacao;
    if (p === 'qualquer_momento') return 'Total desde o início';
    return `Comparado ao ${p === 'mes' ? 'mês anterior' : p === 'semana' ? 'período anterior' : 'dia anterior'}`;
  });

  unidadesLabel = computed(() => {
    const p = this.settings().dashboard.unidadesComparacao;
    const map: Record<string, string> = {
      qualquer_momento: 'UNIDADES (HISTÓRICO)',
      mes: 'UNIDADES (MÊS ATUAL)',
      semana: 'UNIDADES (ESTA SEMANA)',
      dia: 'UNIDADES (HOJE)'
    };
    return map[p] || 'UNIDADES';
  });

  unidadesSublabel = computed(() => {
    const p = this.settings().dashboard.unidadesComparacao;
    if (p === 'qualquer_momento') return 'Volume total acumulado';
    return p === 'mes' ? 'Volume total no período' : 'Volume no período selecionado';
  });

  taxaAlvo = computed(() => this.settings().dashboard.taxaAprovacaoAlvo);

  irParaDetalhe(id: number): void {
    this.router.navigate(['/app/lote', id]);
  }

  irParaNovoLote(): void {
    this.router.navigate(['/app/lote/novo']);
  }

  exportarPDF(): void {
    const data = this.dashboardResource.value();
    if (!data) return;

    const doc = new jsPDF();

    // ── Cabeçalho e Estética Geral ──
    doc.setFillColor(13, 13, 13); // Fundo escuro como o sistema
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(0, 229, 255); // Ciano primário
    doc.text('LOTE PIM', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(173, 170, 170); // Cor ADAAAA
    doc.text('SISTEMA DE GESTÃO DE PRODUÇÃO E QUALIDADE', 14, 30);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    // Usando alinhamento à direita para o título lateral para evitar quebra horizontal
    doc.text('RELATÓRIO EXECUTIVO MENSAL', 196, 25, { align: 'right' });

    // Linha separadora
    doc.setDrawColor(72, 72, 71);
    doc.line(14, 45, 196, 45);

    // ── Métricas de Desempenho ──
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMO DE PRODUÇÃO', 14, 55);

    const tendencia = (val: number) => {
      const txt = val >= 0 ? `+${val}%` : `${val}%`;
      return { text: txt, isPositive: val >= 0 };
    };

    const lotesT = tendencia(data.lotes_tendencia);
    const unidadesT = tendencia(data.unidades_tendencia);

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor Atual', 'Tendência (vs Período Anterior)']],
      body: [
        ['Lotes Produzidos', data.lotes_mes, lotesT.text],
        ['Unidades Produzidas', data.unidades_mes, unidadesT.text],
        ['Taxa de Aprovação', `${data.taxa_aprovacao_mes}%`, '—'],
        ['Lotes em Aberto (Inspeção)', data.aguardando_inspecao, '—']
      ],
      theme: 'striped',
      headStyles: { fillColor: [26, 25, 25], textColor: [255, 255, 255] },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.column.index === 2) {
          const val = dataCell.cell.raw as string;
          if (val.startsWith('+')) dataCell.cell.styles.textColor = [0, 150, 0];
          else if (val.startsWith('-')) dataCell.cell.styles.textColor = [200, 0, 0];
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // ── Tabelas de Ranking ──
    // Top Produtos e Funcionários lado a lado (ou sequenciais)
    doc.setFontSize(12);
    doc.text('RANKING DE PRODUTIVIDADE', 14, currentY);

    if (data.top_produtos && data.top_produtos.length > 0) {
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Produto (Top 10)', 'Unidades Produzidas']],
        body: data.top_produtos.map((p: any) => [p.nome, p.quantidade]),
        theme: 'grid',
        headStyles: { fillColor: [0, 77, 87], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (data.top_funcionarios && data.top_funcionarios.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      autoTable(doc, {
        startY: currentY,
        head: [['Funcionário Destaque', 'Lotes Operados']],
        body: data.top_funcionarios.map((f: any) => [f.nome, f.quantidade_lotes]),
        theme: 'grid',
        headStyles: { fillColor: [0, 77, 87], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // ── Últimos 10 Lotes ──
    if (data.ultimos_lotes && data.ultimos_lotes.length > 0) {
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.text('HISTÓRICO RECENTE (ÚLTIMOS 10 LOTES)', 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Lote', 'Produto', 'Operador', 'Status', 'Data']],
        body: data.ultimos_lotes.map((l: any) => [
          l.numero_lote,
          l.produto.nome,
          l.operador.nome,
          this.formatStatus(l.status),
          new Date(l.aberto_em).toLocaleDateString('pt-BR')
        ]),
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        styles: { fontSize: 8 }
      });
    }

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount} - Gerado via Terminal de Produção LOTE PIM`, 14, 285);
    }

    doc.save(`relatorio-executivo-lotepim-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  getStatusClass(status: string): string {
    const base = 'ml-auto min-h-[20px] text-center rounded-xs py-1 px-3 font-bold text-[10.4px] tracking-[0.52px] flex items-center justify-center leading-tight ';

    switch (status) {
      case 'aprovado':
        return base + 'bg-[#506600] border border-[#C3F400]/20 text-[#EFFFBC]';
      case 'aguardando_inspecao':
        return base + 'bg-[#EAB308]/10 border border-[#EAB308]/20 text-[#EAB308]';
      case 'reprovado':
        return base + 'bg-[#DC2626] border border-[#EF4444] text-[#FFFFFF]';
      case 'aprovado_restricao':
        return base + 'bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316]';
      default:
        return base + 'bg-[#201F1F] text-[#ADAAAA]';
    }
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toUpperCase();
  }
}
