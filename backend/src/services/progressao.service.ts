import { LessThanOrEqual, type Repository } from 'typeorm';
import { Lote, LoteStatus } from '../entities/Lote.js';
import { NotificacaoService } from './notificacao.service.js';
import { TipoNotificacao } from '../entities/Notificacao.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import type { SseService } from './sse.service.js';
import { logger } from '../utils/logger.js';

export class ProgressaoService {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly loteRepo: Repository<Lote>,
    private readonly notificacaoService: NotificacaoService,
    private readonly sseService: SseService,
  ) {}

  // === FUNÇÕES PÚBLICAS ===

  public iniciar(): void {
    logger.info(`Job iniciado — tempo de produção: ${this.tempoProducaoMs / 60000} min`);

    void this.executar();
    this.intervalId = setInterval(() => this.executar(), 2_000);
  }

  public parar(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // === FUNÇÕES PRIVADAS ===

  private get tempoProducaoMs(): number {
    const minutos = Number(process.env.TEMPO_PRODUCAO_MINUTOS) || 2;
    return minutos * 60 * 1000;
  }

  private async executar(): Promise<void> {
    try {
      const limite = new Date(Date.now() - this.tempoProducaoMs);

      const lotesExpirados = await this.loteRepo.find({
        where: {
          status: LoteStatus.EM_PRODUCAO,
          aberto_em: LessThanOrEqual(limite),
        },
      });

      if (lotesExpirados.length === 0) return;

      for (const lote of lotesExpirados) {
        lote.status = LoteStatus.AGUARDANDO_INSPECAO;
        lote.encerrado_em = new Date();

        await this.loteRepo.save(lote);

        logger.info(`Lote ${lote.numero_lote} avançado para AGUARDANDO_INSPECAO`);

        await this.notificacaoService.criarNotificacaoParaPerfis(
          `Produção Concluída: O lote ${lote.numero_lote} está aguardando inspeção.`,
          TipoNotificacao.INSPECAO,
          [PerfilUsuario.INSPETOR],
          { link: `/app/lote/${lote.id}` },
        );

        this.sseService.emitir('lote:status_alterado', {
          id: lote.id,
          status: LoteStatus.AGUARDANDO_INSPECAO,
        });
      }
    } catch (error) {
      logger.error('Erro ao executar job:', error);
    }
  }
}
