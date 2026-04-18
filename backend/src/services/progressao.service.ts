import { LessThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { Lote, LoteStatus } from "../entities/Lote.js";

/**
 * Job de progressão automática de lotes.
 * Avança lotes "em_producao" para "aguardando_inspecao" depois que o
 * tempo configurado em TEMPO_PRODUCAO_MINUTOS expira.
 *
 * Roda a cada 30 segundos para garantir transição rápida.
 */
export class ProgressaoService {
  private intervalId: NodeJS.Timeout | null = null;

  /** Lê o tempo de produção do .env (em minutos, default 2 para demo) */
  private get tempoProducaoMs(): number {
    const minutos = Number(process.env.TEMPO_PRODUCAO_MINUTOS) || 2;
    return minutos * 60 * 1000;
  }

  /** Inicia o job de verificação periódica */
  iniciar(): void {
    console.log(
      `[progressão] Job iniciado — tempo de produção: ${this.tempoProducaoMs / 60000} min`
    );

    this.executar();
    this.intervalId = setInterval(() => this.executar(), 30_000);
  }

  parar(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async executar(): Promise<void> {
    try {
      const loteRepo = AppDataSource.getRepository(Lote);

      const limite = new Date(Date.now() - this.tempoProducaoMs);

      const lotesExpirados = await loteRepo.find({
        where: {
          status: LoteStatus.EM_PRODUCAO,
          aberto_em: LessThanOrEqual(limite),
        },
      });

      if (lotesExpirados.length === 0) return;

      for (const lote of lotesExpirados) {
        lote.status = LoteStatus.AGUARDANDO_INSPECAO;
        lote.encerrado_em = new Date();

        await loteRepo.save(lote);

        console.log(
          `[progressão] Lote ${lote.numero_lote} avançado para AGUARDANDO_INSPECAO`
        );
      }
    } catch (error) {
      console.error("[progressão] Erro ao executar job:", error);
    }
  }
}
