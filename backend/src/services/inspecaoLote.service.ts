import { AppDataSource } from "../config/AppDataSource.js";
import type { Repository } from "typeorm";
import { InspecaoLote, ResultadoInspecao } from "../entities/InspecaoLote.js";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { Usuario, PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import type { RegistrarInspecaoDTO } from "../dto/inspecaoLote.dto.js";

// Mapeia resultado da inspeção para o status do lote
const resultadoParaStatus: Record<ResultadoInspecao, LoteStatus> = {
  [ResultadoInspecao.APROVADO]: LoteStatus.APROVADO,
  [ResultadoInspecao.APROVADO_RESTRICAO]: LoteStatus.APROVADO_RESTRICAO,
  [ResultadoInspecao.REPROVADO]: LoteStatus.REPROVADO,
};

export class InspecaoLoteService {
  private inspecaoRepo: Repository<InspecaoLote>;
  private loteRepo: Repository<Lote>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.inspecaoRepo = AppDataSource.getRepository(InspecaoLote);
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  registrarInspecao = async (
    loteId: number,
    dto: RegistrarInspecaoDTO,
    requisitante: Requisitante
  ): Promise<InspecaoLote> => {
    verificaPermissao(requisitante, [PerfilUsuario.INSPETOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });
    if (!lote) throw new AppError("Lote não encontrado.", 404);

    if (lote.status !== LoteStatus.AGUARDANDO_INSPECAO) {
      throw new AppError(
        "Só é possível inspecionar lotes com status 'aguardando_inspecao'.",
        400
      );
    }

    const inspecaoExistente = await this.inspecaoRepo.findOneBy({ lote: { id: loteId } });
    if (inspecaoExistente) throw new AppError("Este lote já foi inspecionado.", 409);

    const inspetor = await this.usuarioRepo.findOneBy({ id: dto.inspetor_id });
    if (!inspetor) throw new AppError("Inspetor não encontrado.", 404);

    const novaInspecao = this.inspecaoRepo.create({
      lote,
      inspetor,
      resultado: dto.resultado as ResultadoInspecao,
      quantidade_repr: dto.quantidade_repr,
      ...(dto.descricao_desvio ? { descricao_desvio: dto.descricao_desvio } : {}),
    });

    const inspecaoSalva = await this.inspecaoRepo.save(novaInspecao);

    // Atualiza status do lote e quantidade reprovada conforme resultado
    lote.status = resultadoParaStatus[dto.resultado as ResultadoInspecao];
    lote.quantidade_repr = dto.quantidade_repr;
    await this.loteRepo.save(lote);

    return inspecaoSalva;
  };

  buscarInspecaoPorLote = async (
    loteId: number,
    requisitante: Requisitante
  ): Promise<InspecaoLote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const inspecao = await this.inspecaoRepo.findOne({
      where: { lote: { id: loteId } },
      relations: ["inspetor", "lote"],
    });

    if (!inspecao) throw new AppError("Inspeção não encontrada para este lote.", 404);

    return inspecao;
  };
}