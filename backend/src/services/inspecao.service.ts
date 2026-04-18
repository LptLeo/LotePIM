import type { Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { Inspecao, ResultadoInspecao } from "../entities/Inspecao.js";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { Produto } from "../entities/Produto.js";
import { PerfilUsuario, Usuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import type { RegistrarInspecaoDTO } from "../dto/inspecao.dto.js";

/** Mapeia resultado da inspeção para o status final do lote */
const resultadoParaStatus: Record<ResultadoInspecao, LoteStatus> = {
  [ResultadoInspecao.APROVADO]: LoteStatus.APROVADO,
  [ResultadoInspecao.APROVADO_RESTRICAO]: LoteStatus.APROVADO_RESTRICAO,
  [ResultadoInspecao.REPROVADO]: LoteStatus.REPROVADO,
};

export class InspecaoService {
  private inspecaoRepo: Repository<Inspecao>;
  private loteRepo: Repository<Lote>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.inspecaoRepo = AppDataSource.getRepository(Inspecao);
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  /**
   * Calcula o resultado da inspeção automaticamente com base na fórmula:
   * taxa = (reprovados / planejados) × 100
   *
   * - taxa == 0              → APROVADO
   * - 0 < taxa ≤ pct_ressalva → APROVADO COM RESTRIÇÃO
   * - taxa > pct_ressalva     → REPROVADO
   */
  private calcularResultado(
    qtdReprovada: number,
    qtdPlanejada: number,
    percentualRessalva: number
  ): ResultadoInspecao {
    if (qtdReprovada === 0) return ResultadoInspecao.APROVADO;

    const taxaFalha = (qtdReprovada / qtdPlanejada) * 100;

    if (taxaFalha <= percentualRessalva) return ResultadoInspecao.APROVADO_RESTRICAO;
    return ResultadoInspecao.REPROVADO;
  }

  registrar = async (
    loteId: number,
    dto: RegistrarInspecaoDTO,
    requisitante: Requisitante
  ): Promise<Inspecao> => {
    verificaPermissao(requisitante, [PerfilUsuario.INSPETOR]);

    const lote = await this.loteRepo.findOne({
      where: { id: loteId },
      relations: ["produto"],
    });

    if (!lote) throw new AppError("Lote não encontrado.", 404);

    if (lote.status !== LoteStatus.AGUARDANDO_INSPECAO) {
      throw new AppError("Só é possível inspecionar lotes com status 'aguardando_inspecao'.", 400);
    }

    const jaInspecionado = await this.inspecaoRepo.findOneBy({ lote: { id: loteId } });
    if (jaInspecionado) throw new AppError("Este lote já foi inspecionado.", 409);

    if (dto.quantidade_reprovada > lote.quantidade_planejada) {
      throw new AppError(
        `Quantidade reprovada (${dto.quantidade_reprovada}) não pode exceder a planejada (${lote.quantidade_planejada}).`,
        400
      );
    }

    const inspetor = await this.usuarioRepo.findOneBy({ id: requisitante.id });
    if (!inspetor) throw new AppError("Inspetor não encontrado.", 404);

    const resultado = this.calcularResultado(
      dto.quantidade_reprovada,
      lote.quantidade_planejada,
      Number(lote.produto.percentual_ressalva)
    );

    return AppDataSource.transaction(async (manager) => {
      const inspecao = manager.create(Inspecao, {
        lote,
        inspetor,
        quantidade_reprovada: dto.quantidade_reprovada,
        resultado_calculado: resultado,
        descricao_desvio: dto.descricao_desvio || "",
      });

      const inspecaoSalva = await manager.save(inspecao);

      /** Atualiza o status do lote para refletir o resultado */
      lote.status = resultadoParaStatus[resultado];
      await manager.save(lote);

      return inspecaoSalva;
    });
  };

  buscarPorLote = async (loteId: number, requisitante: Requisitante): Promise<Inspecao> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const inspecao = await this.inspecaoRepo.findOne({
      where: { lote: { id: loteId } },
      relations: ["inspetor", "lote"],
    });

    if (!inspecao) throw new AppError("Inspeção não encontrada para este lote.", 404);
    return inspecao;
  };
}
