import {
  DataSource,
  type SelectQueryBuilder,
  ILike,
  type Repository,
  In,
  EntityManager,
  MoreThan,
} from 'typeorm';
import { InsumoEstoque, Turno, InsumoEstoqueStatus } from '../entities/InsumoEstoque.js';
import { MateriaPrima } from '../entities/MateriaPrima.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import { findOneOrFail, managerFindOneByOrFail } from '../utils/orm.utils.js';
import type {
  CriarInsumoEstoqueDTO,
  ListInsumosQueryDto,
} from '../dto/insumoEstoque.dto.js';
import { formatarRespostaPaginada, type RespostaPaginada } from '../dto/paginacao.dto.js';
import { NotificacaoService } from './notificacao.service.js';
import { TipoNotificacao } from '../entities/Notificacao.js';
import { logger } from '../utils/logger.js';
import { SseService } from './sse.service.js';

// === CONSTANTES ===

const MILISSEGUNDOS_POR_MINUTO = 60_000;
const TIMEOUT_LOTE_EM_TRANSITO_MS = MILISSEGUNDOS_POR_MINUTO;

// === TIPOS ===

interface ResultadoContagem {
  total: number;
  comSaldo: number;
  esgotados: number;
}

// === SERVICE ===

export class InsumoEstoqueService {
  private static readonly TRANSICOES_PERMITIDAS: Partial<
    Record<InsumoEstoqueStatus, InsumoEstoqueStatus[]>
  > = {
    [InsumoEstoqueStatus.A_CAMINHO]: [InsumoEstoqueStatus.PENDENTE],
    [InsumoEstoqueStatus.PENDENTE]: [InsumoEstoqueStatus.DISPONIVEL],
    [InsumoEstoqueStatus.DISPONIVEL]: [],
  };

  constructor(
    private readonly insumoEstoqueRepo: Repository<InsumoEstoque>,
    private readonly notificacaoService: NotificacaoService,
    private readonly dataSource: DataSource,
    private readonly sseService: SseService,
  ) {}

  public async receberLoteInsumo(
    dto: CriarInsumoEstoqueDTO,
    requisitante: Requisitante,
  ): Promise<InsumoEstoque> {
    return this.dataSource.transaction(async (manager) => {
      verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

      const materiaPrima = await this.buscarMateriaPrima(manager, dto.materiaPrimaId);
      this.validarQuantidadeParaUnidade(materiaPrima, dto.quantidade_inicial);

      const operador = await this.buscarOperador(manager, requisitante.id);
      const numeroLote = await this.gerarNumeroLote(manager);

      const entidade = this.montarEntidadeInsumo(manager, {
        materiaPrima,
        operador,
        numeroLote,
        dto,
      });

      const salvo = await manager.save(entidade);
      this.sseService.emitir('insumo:criado', { id: salvo.id, status: salvo.status });

      return salvo;
    });
  }

  public async receberLoteInsumoBulk(
    dto: { itens: CriarInsumoEstoqueDTO[] },
    requisitante: Requisitante,
  ): Promise<InsumoEstoque[]> {
    return this.dataSource.transaction(async (manager) => {
      verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

      const operador = await this.buscarOperador(manager, requisitante.id);
      const mpIds = dto.itens.map((i) => i.materiaPrimaId);
      const materiasPrimas = await manager.findBy(MateriaPrima, { id: In(mpIds) });

      const prefixo = this.gerarPrefixoLote();
      const contagemBase = await manager.getRepository(InsumoEstoque).count({
        where: { numero_lote_interno: ILike(`${prefixo}%`) },
      });

      const entidades = dto.itens.map((itemDto, indice) => {
        const materiaPrima = materiasPrimas.find((m) => m.id === itemDto.materiaPrimaId);
        if (!materiaPrima) {
          throw new AppError(
            `Matéria-prima ${itemDto.materiaPrimaId} não encontrada.`,
            404,
          );
        }
        const numeroLote = `${prefixo}${contagemBase + indice + 1}`;
        return this.montarEntidadeInsumo(manager, {
          materiaPrima,
          operador,
          numeroLote,
          dto: itemDto,
        });
      });

      const salvos = await manager.save(entidades, { chunk: 100 });
      for (const item of salvos) {
        this.sseService.emitir('insumo:criado', { id: item.id, status: item.status });
      }

      return salvos;
    });
  }

  public async listar(
    query: ListInsumosQueryDto,
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<InsumoEstoque>> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const skip = (query.pagina - 1) * query.limite;

    const queryBuilder = this.insumoEstoqueRepo
      .createQueryBuilder('ie')
      .leftJoinAndSelect('ie.materiaPrima', 'mp')
      .leftJoinAndSelect('ie.operador', 'op')
      .skip(skip)
      .take(query.limite);

    this.aplicarFiltros(queryBuilder, query);
    this.aplicarOrdenacao(queryBuilder, query.ordenarPor);

    const [itens, total] = await queryBuilder.getManyAndCount();
    return formatarRespostaPaginada([itens, total], query);
  }

  public async atualizarStatus(
    id: number,
    novoStatus: InsumoEstoqueStatus,
    requisitante: Requisitante,
  ): Promise<InsumoEstoque> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const insumo = await this.buscarInsumoOuLancarErro(id, ['materiaPrima']);
    const statusAnterior = insumo.status;
    this.validarTransicaoDeStatus(insumo.status, novoStatus);
    insumo.status = novoStatus;
    const salvo = await this.insumoEstoqueRepo.save(insumo);
    await this.gerarNotificacaoDeStatus(statusAnterior, novoStatus, insumo);
    this.sseService.emitir('insumo:status_alterado', {
      id: salvo.id,
      status: salvo.status,
    });
    return salvo;
  }

  public async buscarPorId(
    id: number,
    requisitante: Requisitante,
  ): Promise<InsumoEstoque> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);
    return this.buscarInsumoOuLancarErro(id, ['materiaPrima', 'operador']);
  }

  public async obterResumoDeEstoque(
    requisitante: Requisitante,
  ): Promise<ResultadoContagem> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const statusAtivos = [InsumoEstoqueStatus.DISPONIVEL, InsumoEstoqueStatus.PENDENTE];

    const [total, comSaldo, esgotados] = await Promise.all([
      this.insumoEstoqueRepo.count({
        where: { status: In(statusAtivos) },
      }),
      this.insumoEstoqueRepo.count({
        where: {
          status: InsumoEstoqueStatus.DISPONIVEL,
          quantidade_atual: MoreThan(0),
        },
      }),
      this.insumoEstoqueRepo.count({
        where: {
          status: InsumoEstoqueStatus.DISPONIVEL,
          quantidade_atual: 0,
        },
      }),
    ]);

    return { total, comSaldo, esgotados };
  }

  public async listarInsumosDisponiveisPorMateriaPrima(
    materiaPrimaIds: number[],
    requisitante: Requisitante,
  ): Promise<InsumoEstoque[]> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    if (materiaPrimaIds.length === 0) return [];

    return this.insumoEstoqueRepo
      .createQueryBuilder('ie')
      .leftJoinAndSelect('ie.materiaPrima', 'mp')
      .leftJoinAndSelect('ie.operador', 'op')
      .where('mp.id IN (:...ids)', { ids: materiaPrimaIds })
      .andWhere('ie.quantidade_atual > 0')
      .andWhere('ie.status = :status', { status: InsumoEstoqueStatus.DISPONIVEL })
      .andWhere('ie.ativo = true')
      .orderBy('mp.nome', 'ASC')
      .addOrderBy('ie.recebido_em', 'DESC')
      .getMany();
  }

  public async resgatarLotesTravados(): Promise<void> {
    const umMinutoAtras = new Date(Date.now() - TIMEOUT_LOTE_EM_TRANSITO_MS);

    const resultado = await this.insumoEstoqueRepo
      .createQueryBuilder()
      .update(InsumoEstoque)
      .set({ status: InsumoEstoqueStatus.PENDENTE })
      .where('status = :status', { status: InsumoEstoqueStatus.A_CAMINHO })
      .andWhere('criado_em < :data', { data: umMinutoAtras })
      .execute();

    if (resultado.affected && resultado.affected > 0) {
      logger.info(
        `[Self-Healing] ${resultado.affected} lotes em trânsito foram resgatados.`,
      );
    }
  }

  public simularChegadaDeLotes(recebidos: InsumoEstoque[], requisitante: Requisitante) {
    setTimeout(async () => {
      for (const item of recebidos) {
        try {
          const atualizado = await this.atualizarStatus(
            item.id,
            InsumoEstoqueStatus.PENDENTE,
            requisitante,
          );
          this.sseService.emitir('insumo:status_alterado', {
            id: atualizado.id,
            status: atualizado.status,
          });
        } catch (err) {
          logger.error(`[Logistica] Erro ao atualizar chegada do lote ${item.id}:`, err);
        }
      }
    }, 10000);
  }

  // === BUSCADORES ===

  private buscarMateriaPrima(
    manager: EntityManager,
    materiaPrimaId: number,
  ): Promise<MateriaPrima> {
    return managerFindOneByOrFail(
      manager,
      MateriaPrima,
      { id: materiaPrimaId },
      { entityName: 'Matéria-prima' },
    );
  }

  private buscarOperador(manager: EntityManager, operadorId: number): Promise<Usuario> {
    return managerFindOneByOrFail(
      manager,
      Usuario,
      { id: operadorId },
      { entityName: 'Operador' },
    );
  }

  private buscarInsumoOuLancarErro(
    id: number,
    relations: string[],
  ): Promise<InsumoEstoque> {
    return findOneOrFail(
      this.insumoEstoqueRepo,
      { where: { id }, relations },
      'Lote de insumo',
    );
  }

  // === VALIDADORES ===

  private validarQuantidadeParaUnidade(
    materiaPrima: MateriaPrima,
    quantidade: number,
  ): void {
    if (materiaPrima.unidade_medida === 'UN' && !Number.isInteger(quantidade)) {
      throw new AppError("A quantidade para unidade 'UN' não pode ser fracionada.", 400);
    }
  }

  private validarTransicaoDeStatus(
    atual: InsumoEstoqueStatus,
    novo: InsumoEstoqueStatus,
  ): void {
    const permitidos = InsumoEstoqueService.TRANSICOES_PERMITIDAS[atual] ?? [];
    if (!permitidos.includes(novo)) {
      throw new AppError(`Transição de status inválida: '${atual}' → '${novo}'.`, 422);
    }
  }

  // === GERADORES ===

  private gerarPrefixoLote(data = new Date()): string {
    const dd = data.getUTCDate().toString().padStart(2, '0');
    const mm = (data.getUTCMonth() + 1).toString().padStart(2, '0');
    const yyyy = data.getUTCFullYear();
    return `INS-${dd}${mm}${yyyy}-`;
  }

  private async gerarNumeroLote(manager?: EntityManager): Promise<string> {
    const prefixo = this.gerarPrefixoLote();
    const repo = manager ? manager.getRepository(InsumoEstoque) : this.insumoEstoqueRepo;
    const contagem = await repo.count({
      where: { numero_lote_interno: ILike(`${prefixo}%`) },
    });
    return `${prefixo}${contagem + 1}`;
  }

  private montarEntidadeInsumo(
    manager: EntityManager,
    params: {
      materiaPrima: MateriaPrima;
      operador: Usuario;
      numeroLote: string;
      dto: CriarInsumoEstoqueDTO;
    },
  ): InsumoEstoque {
    const { materiaPrima, operador, numeroLote, dto } = params;

    return manager.create(InsumoEstoque, {
      materiaPrima,
      operador,
      status: (dto.status as InsumoEstoqueStatus) || InsumoEstoqueStatus.DISPONIVEL,
      numero_lote_fornecedor: dto.numero_lote_fornecedor || '',
      numero_lote_interno: numeroLote,
      quantidade_inicial: dto.quantidade_inicial,
      quantidade_atual: dto.quantidade_inicial,
      fornecedor: dto.fornecedor,
      codigo_interno: dto.codigo_interno || '',
      turno: dto.turno as Turno,
      data_validade: dto.data_validade ?? null,
      observacoes: dto.observacoes || '',
    });
  }

  // === AUXILIARES DE CONSULTA ===

  private aplicarOrdenacao(
    queryBuilder: SelectQueryBuilder<InsumoEstoque>,
    ordenarPor: ListInsumosQueryDto['ordenarPor'],
  ): void {
    const ordenacoes: Record<string, () => void> = {
      menor_estoque: () => queryBuilder.orderBy('ie.quantidade_atual', 'ASC'),
      maior_estoque: () => queryBuilder.orderBy('ie.quantidade_atual', 'DESC'),
      mais_recente: () => queryBuilder.orderBy('ie.recebido_em', 'DESC'),
      menos_recente: () => queryBuilder.orderBy('ie.recebido_em', 'ASC'),
    };
    const ordenar = ordenacoes[ordenarPor ?? ''];
    if (ordenar) ordenar();
    else
      queryBuilder
        .orderBy('ie.recebido_em', 'DESC')
        .addOrderBy('ie.id', 'DESC')
        .addOrderBy('mp.nome', 'ASC');
  }

  private aplicarFiltros(
    queryBuilder: SelectQueryBuilder<InsumoEstoque>,
    query: ListInsumosQueryDto,
  ): void {
    if (query.busca) {
      queryBuilder.andWhere(
        '(ie.numero_lote_interno ILIKE :busca OR ie.numero_lote_fornecedor ILIKE :busca OR mp.nome ILIKE :busca)',
        { busca: `%${query.busca}%` },
      );
    }

    if (query.materiaPrimaId) {
      queryBuilder.andWhere('mp.id = :mpId', { mpId: Number(query.materiaPrimaId) });
    }

    if (query.esgotado) {
      queryBuilder.andWhere('ie.quantidade_atual = 0');
    }

    if (query.fornecedor) {
      queryBuilder.andWhere('ie.fornecedor ILIKE :fornecedor', {
        fornecedor: `%${query.fornecedor}%`,
      });
    }

    if (query.status && query.status.length > 0) {
      queryBuilder.andWhere('ie.status IN (:...status)', { status: query.status });
    }
  }

  // === NOTIFICAÇÕES ===

  private async gerarNotificacaoDeStatus(
    statusAnterior: InsumoEstoqueStatus,
    novoStatus: InsumoEstoqueStatus,
    insumo: InsumoEstoque,
  ): Promise<void> {
    const foiRecebido =
      statusAnterior !== InsumoEstoqueStatus.DISPONIVEL &&
      novoStatus === InsumoEstoqueStatus.DISPONIVEL;

    if (!foiRecebido) return;

    await this.notificacaoService.criarNotificacaoParaPerfis(
      `Logística: O lote de insumo ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) foi recebido e está disponível para produção.`,
      TipoNotificacao.SISTEMA,
      [PerfilUsuario.GESTOR],
      { link: '/app/insumos', filtro: insumo.materiaPrima.nome },
    );
  }
}
