import type { DataSource, Repository } from 'typeorm';
import { Inspecao, ResultadoInspecao } from '../entities/Inspecao.js';
import { Lote, LoteStatus } from '../entities/Lote.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import type { RegistrarInspecaoDTO } from '../dto/inspecao.dto.js';
import { calcularResultadoInspecao } from '../utils/inspecao.utils.js';
import { findOneByOrFail, findOneOrFail } from '../utils/orm.utils.js';
import type { SseService } from './sse.service.js';

interface RegistrarInspecaoParams {
  loteId: number;
  dto: RegistrarInspecaoDTO;
  requisitante: Requisitante;
}

export class InspecaoService {
  private static readonly resultadoParaStatus: Record<ResultadoInspecao, LoteStatus> = {
    [ResultadoInspecao.APROVADO]: LoteStatus.APROVADO,
    [ResultadoInspecao.APROVADO_RESTRICAO]: LoteStatus.APROVADO_RESTRICAO,
    [ResultadoInspecao.REPROVADO]: LoteStatus.REPROVADO,
  };

  constructor(
    private readonly inspecaoRepo: Repository<Inspecao>,
    private readonly loteRepo: Repository<Lote>,
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly dataSource: DataSource,
    private readonly sseService: SseService,
  ) {}

  public async registrar(params: RegistrarInspecaoParams): Promise<Inspecao> {
    verificaPermissao(params.requisitante, [PerfilUsuario.INSPETOR]);

    const { loteId, dto, requisitante } = params;

    const lote = await this.buscarEValidarLote(loteId);

    await this.validarInspecaoDuplicada(loteId);
    this.validarQuantidadeReprovada(dto.quantidade_reprovada, lote.quantidade_planejada);

    const inspetor = await this.buscarInspetor(requisitante.id);

    const resultado = calcularResultadoInspecao(
      dto.quantidade_reprovada,
      lote.quantidade_planejada,
      Number(lote.produto.percentual_ressalva),
    );

    const resultadoParaStatus = InspecaoService.resultadoParaStatus;

    const inspecaoSalva = await this.dataSource.transaction(async (manager) => {
      const inspecao = manager.create(Inspecao, {
        lote,
        inspetor,
        quantidade_reprovada: dto.quantidade_reprovada,
        resultado_calculado: resultado,
        descricao_desvio: dto.descricao_desvio ?? null,
      });

      const salva = await manager.save(inspecao);

      lote.status = resultadoParaStatus[resultado];
      await manager.save(lote);

      return salva;
    });

    this.sseService.emitir('lote:status_alterado', {
      id: lote.id,
      status: lote.status,
    });

    return inspecaoSalva;
  }

  public async buscarPorLote(
    loteId: number,
    requisitante: Requisitante,
  ): Promise<Inspecao> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const inspecao = await this.buscarOuFalharInspecaoPorLote(loteId);

    return inspecao;
  }

  // === FUNÇÕES BUSCADORAS ===

  private async buscarEValidarLote(loteId: number): Promise<Lote> {
    const lote = await findOneOrFail(
      this.loteRepo,
      { where: { id: loteId }, relations: ['produto'] },
      'Lote',
    );

    if (lote.status !== LoteStatus.AGUARDANDO_INSPECAO) {
      throw new AppError(
        "Só é possível inspecionar lotes com status 'aguardando_inspecao'.",
        400,
      );
    }

    return lote;
  }

  private async buscarInspetor(inspetorId: number): Promise<Usuario> {
    return findOneByOrFail(this.usuarioRepo, { id: inspetorId }, 'Inspetor');
  }

  private async buscarOuFalharInspecaoPorLote(loteId: number): Promise<Inspecao> {
    return findOneOrFail(
      this.inspecaoRepo,
      { where: { lote: { id: loteId } }, relations: ['inspetor', 'lote'] },
      'Inspeção',
    );
  }

  // === FUNÇÕES VALIDADORAS ===

  private async validarInspecaoDuplicada(loteId: number): Promise<void> {
    const jaInspecionado = await this.inspecaoRepo.findOneBy({
      lote: { id: loteId },
    });

    if (jaInspecionado) {
      throw new AppError('Este lote já foi inspecionado.', 409);
    }
  }

  private validarQuantidadeReprovada(qtdReprovada: number, qtdPlanejada: number): void {
    if (qtdReprovada > qtdPlanejada) {
      throw new AppError(
        `Quantidade reprovada (${qtdReprovada}) não pode exceder a planejada (${qtdPlanejada}).`,
        400,
      );
    }
  }
}
