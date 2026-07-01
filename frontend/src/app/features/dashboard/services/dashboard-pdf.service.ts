import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardData } from '../models/dashboard.interface.js';
import { formatarStatus } from '../../../shared/utils/lote-status.js';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

const COR_CABECALHO_FUNDO: [number, number, number] = [13, 13, 13];
const COR_CABECALHO_TEXTO: [number, number, number] = [0, 229, 255];
const COR_SUBTITULO: [number, number, number] = [173, 170, 170];
const COR_BRANCO: [number, number, number] = [255, 255, 255];
const COR_LINHA: [number, number, number] = [72, 72, 71];
const COR_PRETO: [number, number, number] = [0, 0, 0];
const COR_VERDE: [number, number, number] = [0, 150, 0];
const COR_VERMELHO: [number, number, number] = [200, 0, 0];
const COR_TABELA_CABECALHO: [number, number, number] = [26, 25, 25];
const COR_TABELA_DESTAQUE: [number, number, number] = [0, 77, 87];
const COR_TABELA_HISTORICO: [number, number, number] = [40, 40, 40];
const COR_RODAPE: [number, number, number] = [150, 150, 150];

const MARGEM_ESQUERDA = 14;
const MARGEM_DIREITA = 196;
const ALTURA_CABECALHO = 40;
const ESPACO_SECAO = 15;

@Injectable({ providedIn: 'root' })
export class DashboardPdfService {
  // === CONSTRUÇÃO DO RELATÓRIO ===

  gerarRelatorio(dados: DashboardData): void {
    const doc = new jsPDF();

    this.adicionarCabecalho(doc);
    this.adicionarSeparador(doc);
    this.adicionarResumoProducao(doc, dados);
    this.adicionarRankingProdutos(doc, dados);
    this.adicionarRankingFuncionarios(doc, dados);
    this.adicionarHistoricoRecente(doc, dados);
    this.adicionarNumeracaoPaginas(doc);

    const hoje = new Date().toISOString().split('T')[0];
    doc.save(`relatorio-executivo-lotepim-${hoje}.pdf`);
  }

  // === CABEÇALHO ===

  private adicionarCabecalho(doc: jsPDF): void {
    doc.setFillColor(...COR_CABECALHO_FUNDO);
    doc.rect(0, 0, 210, ALTURA_CABECALHO, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...COR_CABECALHO_TEXTO);
    doc.text('LOTE PIM', MARGEM_ESQUERDA, 22);

    doc.setFontSize(10);
    doc.setTextColor(...COR_SUBTITULO);
    doc.text('SISTEMA DE GESTÃO DE PRODUÇÃO E QUALIDADE', MARGEM_ESQUERDA, 30);

    doc.setTextColor(...COR_BRANCO);
    doc.setFontSize(14);
    doc.text('RELATÓRIO EXECUTIVO MENSAL', MARGEM_DIREITA, 25, { align: 'right' });
  }

  private adicionarSeparador(doc: jsPDF): void {
    doc.setDrawColor(...COR_LINHA);
    doc.line(MARGEM_ESQUERDA, 45, MARGEM_DIREITA, 45);
  }

  // === RESUMO DE PRODUÇÃO ===

  private adicionarResumoProducao(doc: jsPDF, dados: DashboardData): void {
    doc.setFontSize(12);
    doc.setTextColor(...COR_PRETO);
    doc.text('RESUMO DE PRODUÇÃO', MARGEM_ESQUERDA, 55);

    const tendenciaLotes = this.formatarTendencia(dados.lotes_tendencia);
    const tendenciaUnidades = this.formatarTendencia(dados.unidades_tendencia);

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor Atual', 'Tendência (vs Período Anterior)']],
      body: [
        ['Lotes Produzidos', dados.lotes_mes, tendenciaLotes],
        ['Unidades Produzidas', dados.unidades_mes, tendenciaUnidades],
        ['Taxa de Aprovação', `${dados.taxa_aprovacao_mes}%`, '—'],
        ['Lotes em Aberto (Inspeção)', dados.aguardando_inspecao, '—'],
      ],
      theme: 'striped',
      headStyles: { fillColor: COR_TABELA_CABECALHO, textColor: COR_BRANCO },
      didParseCell: (dadosCelula) => {
        if (dadosCelula.section === 'body' && dadosCelula.column.index === 2) {
          const texto = dadosCelula.cell.raw as string;
          if (texto.startsWith('+')) {
            dadosCelula.cell.styles.textColor = COR_VERDE;
          } else if (texto.startsWith('-')) {
            dadosCelula.cell.styles.textColor = COR_VERMELHO;
          }
        }
      },
    });
  }

  // === RANKINGS ===

  private adicionarRankingProdutos(doc: jsPDF, dados: DashboardData): void {
    if (!dados.top_produtos?.length) return;

    const inicioY = doc.lastAutoTable.finalY + ESPACO_SECAO;

    doc.setFontSize(12);
    doc.text('RANKING DE PRODUTIVIDADE', MARGEM_ESQUERDA, inicioY);

    autoTable(doc, {
      startY: inicioY + 5,
      head: [['Produto (Top 10)', 'Unidades Produzidas']],
      body: dados.top_produtos.map((produto) => [produto.nome, produto.quantidade]),
      theme: 'grid',
      headStyles: { fillColor: COR_TABELA_DESTAQUE, textColor: COR_BRANCO },
      styles: { fontSize: 9 },
    });
  }

  private adicionarRankingFuncionarios(doc: jsPDF, dados: DashboardData): void {
    if (!dados.top_funcionarios?.length) return;

    let inicioY = doc.lastAutoTable.finalY + ESPACO_SECAO;

    if (inicioY > 240) {
      doc.addPage();
      inicioY = 20;
    }

    autoTable(doc, {
      startY: inicioY,
      head: [['Funcionário Destaque', 'Lotes Operados']],
      body: dados.top_funcionarios.map((funcionario) => [
        funcionario.nome,
        funcionario.quantidade_lotes,
      ]),
      theme: 'grid',
      headStyles: { fillColor: COR_TABELA_DESTAQUE, textColor: COR_BRANCO },
      styles: { fontSize: 9 },
    });
  }

  // === HISTÓRICO RECENTE ===

  private adicionarHistoricoRecente(doc: jsPDF, dados: DashboardData): void {
    if (!dados.ultimos_lotes?.length) return;

    let inicioY = doc.lastAutoTable.finalY + ESPACO_SECAO;

    if (inicioY > 220) {
      doc.addPage();
      inicioY = 20;
    }

    doc.setFontSize(12);
    doc.text('HISTÓRICO RECENTE (ÚLTIMOS 10 LOTES)', MARGEM_ESQUERDA, inicioY);

    autoTable(doc, {
      startY: inicioY + 5,
      head: [['Lote', 'Produto', 'Operador', 'Status', 'Data']],
      body: dados.ultimos_lotes.map((lote) => [
        lote.numero_lote,
        lote.produto.nome,
        lote.operador.nome,
        formatarStatus(lote.status),
        new Date(lote.aberto_em).toLocaleDateString('pt-BR'),
      ]),
      theme: 'striped',
      headStyles: { fillColor: COR_TABELA_HISTORICO, textColor: COR_BRANCO },
      styles: { fontSize: 8 },
    });
  }

  // === NUMERAÇÃO DE PÁGINAS ===

  private adicionarNumeracaoPaginas(doc: jsPDF): void {
    const totalPaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      doc.setPage(pagina);
      doc.setFontSize(8);
      doc.setTextColor(...COR_RODAPE);
      doc.text(
        `Página ${pagina} de ${totalPaginas} - Gerado via Terminal de Produção LOTE PIM`,
        MARGEM_ESQUERDA,
        285,
      );
    }
  }

  // === UTILITÁRIOS ===

  private formatarTendencia(valor: number): string {
    return valor >= 0 ? `+${valor}%` : `${valor}%`;
  }
}
