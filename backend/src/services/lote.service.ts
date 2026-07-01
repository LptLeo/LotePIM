import { ILike, type DataSource, type EntityManager, type Repository } from 'typeorm';
import { Lote, LoteStatus } from '../entities/Lote.js';
import { ConsumoInsumo } from '../entities/ConsumoInsumo.js';
import { InsumoEstoque } from '../entities/InsumoEstoque.js';
import { Produto } from '../entities/Produto.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';
import { MSG } from '../errors/errorMessages.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import { logger } from '../utils/logger.js';
import {
  findOneByOrFail,
  findOneOrFail,
  managerFindOneOrFail,
} from '../utils/orm.utils.js';
import type { CriarLoteDTO } from '../dto/lote.dto.js';
import { NotificacaoService } from './notificacao.service.js';
import type { SseService } from './sse.service.js';
import { TipoNotificacao } from '../entities/Notificacao.js';
import {
  formatarRespostaPaginada,
  type PaginacaoQueryDto,
  type RespostaPaginada,
} from '../dto/paginacao.dto.js';

interface LoteDependencies {
  loteRepo: Repository<Lote>;
  produtoRepo: Repository<Produto>;
  usuarioRepo: Repository<Usuario>;
  notificacaoService: NotificacaoService;
  dataSource: DataSource;
  sseService: SseService;
  tempoProducaoMinutos: number;
}

export class LoteService {
  constructor(private readonly dependencies: LoteDependencies) {}

  public async criar(dto: CriarLoteDTO, requisitante: Requisitante): Promise<Lote> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const produto = await findOneByOrFail(
      this.dependencies.produtoRepo,
      { id: dto.produto_id },
      'Produto',
      404,
    );

    if (!produto.ativo) {
      throw new AppError('Produto desativado não pode ser usado em novo lote.', 400);
    }
    const operador = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id: requisitante.id },
      'Operador',
      404,
    );

    const numeroLote = await this.gerarNumeroLote(dto.data_producao);
    logger.info(`Criando lote ${numeroLote} pelo operador ${requisitante.id}`);

    return this.dependencies.dataSource.transaction((manager) =>
      this.executarCriacaoEmTransacao({ manager, dto, produto, operador, numeroLote }),
    );
  }

  public async listar(
    query: PaginacaoQueryDto & { status?: string | undefined },
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<Lote>> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const { pagina, limite, busca, status } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.dependencies.loteRepo
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.produto', 'produto')
      .leftJoinAndSelect('lote.operador', 'operador')
      .leftJoinAndSelect('lote.inspecao', 'inspecao')
      .leftJoinAndSelect('lote.consumos', 'consumos')
      .skip(skip)
      .take(limite)
      .orderBy('lote.aberto_em', 'DESC');

    if (busca) {
      queryBuilder.andWhere(
        '(lote.numero_lote ILIKE :busca OR produto.nome ILIKE :busca)',
        {
          busca: `%${busca}%`,
        },
      );
    }

    if (status && status !== 'todos') {
      queryBuilder.andWhere('lote.status = :status', { status });
    }

    const [lotes, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada([lotes, total], query);
  }

  public async obterContagemPorStatus(
    requisitante: Requisitante,
  ): Promise<Record<string, number>> {
    verificaPermissao(requisitante, [
      PerfilUsuario.GESTOR,
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
    ]);

    const counts = await this.dependencies.loteRepo
      .createQueryBuilder('lote')
      .select('lote.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lote.status')
      .getRawMany<{ status: string; count: string }>();

    const result: Record<string, number> = {
      todos: 0,
      em_producao: 0,
      aguardando_inspecao: 0,
      aprovado: 0,
      aprovado_restricao: 0,
      reprovado: 0,
    };

    let total = 0;
    counts.forEach((c) => {
      const count = Number(c.count);
      result[c.status] = count;
      total += count;
    });
    result.todos = total;

    return result;
  }

  public async buscarSugestoes(q: string, requisitante: Requisitante) {
    verificaPermissao(requisitante, [
      PerfilUsuario.GESTOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.OPERADOR,
    ]);

    const termo = `%${q}%`;

    const [lotes, produtos] = await Promise.all([
      this.dependencies.loteRepo
        .createQueryBuilder('l')
        .where('l.numero_lote ILIKE :termo', { termo })
        .limit(5)
        .getMany(),
      this.dependencies.produtoRepo
        .createQueryBuilder('p')
        .where('p.nome ILIKE :termo OR p.sku ILIKE :termo', { termo })
        .limit(5)
        .getMany(),
    ]);

    return [
      ...lotes.map((l) => ({
        id: l.id,
        label: l.numero_lote,
        subtext: 'Lote de Produção',
        tipo: 'lote' as const,
        status: l.status,
      })),
      ...produtos.map((p) => ({
        id: p.id,
        label: p.nome,
        subtext: p.sku,
        tipo: 'produto' as const,
      })),
    ];
  }

  public async buscarPorId(id: number, requisitante: Requisitante): Promise<Lote> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    return findOneOrFail(
      this.dependencies.loteRepo,
      {
        where: { id },
        relations: [
          'operador',
          'produto',
          'produto.receita',
          'produto.receita.materiaPrima',
          'consumos',
          'consumos.insumoEstoque',
          'consumos.insumoEstoque.materiaPrima',
          'inspecao',
          'inspecao.inspetor',
        ],
      },
      MSG.loteNaoEncontrado,
      404,
    );
  }

  /** Endpoint para o frontend obter o tempo de produção configurado */
  public obterTempoProducao(): number {
    return this.dependencies.tempoProducaoMinutos;
  }

  // === FUNÇÕES PRIVADAS ===

  private async gerarNumeroLote(data: Date | string): Promise<string> {
    const d = typeof data === 'string' ? new Date(data) : data;
    const dia = d.getUTCDate().toString().padStart(2, '0');
    const mes = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const ano = d.getUTCFullYear();

    const prefixo = `LOT-${dia}${mes}${ano}-`;

    const contagem = await this.dependencies.loteRepo.count({
      where: { numero_lote: ILike(`${prefixo}%`) },
    });

    const sequencial = contagem + 1;
    const numeroLote = `${prefixo}${sequencial}`;

    const regex = /^LOT-\d{8}-\d+$/;
    if (!regex.test(numeroLote)) {
      throw new AppError('Erro ao gerar número de lote no padrão esperado.', 500);
    }

    return numeroLote;
  }

  private validarConsumo(insumo: InsumoEstoque, quantidadeConsumida: number): void {
    if (
      insumo.materiaPrima.unidade_medida === 'UN' &&
      !Number.isInteger(quantidadeConsumida)
    ) {
      throw new AppError(
        `A matéria-prima '${insumo.materiaPrima.nome}' não aceita consumo de lote fracionado.`,
        400,
      );
    }

    if (!insumo.ativo) {
      throw new AppError(
        `Lote ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) está inativo.`,
        400,
      );
    }

    const saldoAtual = Number(insumo.quantidade_atual);
    if (saldoAtual < quantidadeConsumida) {
      throw new AppError(
        `Saldo insuficiente no lote ${insumo.numero_lote_interno}. ` +
          `Disponível: ${saldoAtual}, Solicitado: ${quantidadeConsumida}.`,
        400,
      );
    }
  }

  private async criarNotificacoesConsumo(
    insumo: InsumoEstoque,
    saldoAtual: number,
    novoSaldo: number,
    gestores: Usuario[],
  ): Promise<void> {
    const percentualAnterior = (saldoAtual / insumo.quantidade_inicial) * 100;
    const percentualNovo = (novoSaldo / insumo.quantidade_inicial) * 100;

    for (const gestor of gestores) {
      if (
        percentualAnterior > gestor.alerta_estoque_porcentagem &&
        percentualNovo <= gestor.alerta_estoque_porcentagem &&
        percentualNovo > 0
      ) {
        await this.dependencies.notificacaoService.criarNotificacaoParaUsuario(
          `Estoque Baixo: O insumo ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) atingiu ${percentualNovo.toFixed(1)}% do seu volume inicial.`,
          TipoNotificacao.ESTOQUE,
          gestor,
          { link: '/app/insumos', filtro: insumo.materiaPrima.nome },
        );
      }

      if (percentualAnterior > 0 && percentualNovo === 0) {
        await this.dependencies.notificacaoService.criarNotificacaoParaUsuario(
          `URGENTE: O lote de insumo ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) ACABOU completamente.`,
          TipoNotificacao.ESTOQUE,
          gestor,
          { link: '/app/insumos', filtro: insumo.materiaPrima.nome },
        );
      }
    }
  }

  private async processarConsumos(
    manager: EntityManager,
    consumos: CriarLoteDTO['consumos'],
    loteSalvo: Lote,
    gestores: Usuario[],
  ): Promise<void> {
    for (const consumo of consumos) {
      const insumo = await managerFindOneOrFail(
        manager,
        InsumoEstoque,
        { where: { id: consumo.insumo_estoque_id }, relations: ['materiaPrima'] },
        { entityName: `Lote de insumo ID ${consumo.insumo_estoque_id}`, statusCode: 404 },
      );

      this.validarConsumo(insumo, consumo.quantidade_consumida);

      const saldoAtual = Number(insumo.quantidade_atual);
      const novoSaldo = saldoAtual - consumo.quantidade_consumida;
      insumo.quantidade_atual = novoSaldo;
      await manager.save(insumo);

      const registro = manager.create(ConsumoInsumo, {
        lote: loteSalvo,
        insumoEstoque: insumo,
        quantidade_consumida: consumo.quantidade_consumida,
      });
      await manager.save(registro);

      await this.criarNotificacoesConsumo(insumo, saldoAtual, novoSaldo, gestores);
    }
  }

  private async executarCriacaoEmTransacao(config: {
    manager: EntityManager;
    dto: CriarLoteDTO;
    produto: Produto;
    operador: Usuario;
    numeroLote: string;
  }): Promise<Lote> {
    const { manager, dto, produto, operador, numeroLote } = config;
    const loteSalvo = await manager.save(
      manager.create(Lote, {
        numero_lote: numeroLote,
        produto,
        quantidade_planejada: dto.quantidade_planejada,
        status: LoteStatus.EM_PRODUCAO,
        turno: dto.turno,
        operador,
        data_producao: dto.data_producao,
        data_validade: dto.data_validade ?? null,
        observacoes: dto.observacoes || '',
      }),
    );
    const gestores = await manager.find(Usuario, {
      where: { perfil: PerfilUsuario.GESTOR, ativo: true },
    });
    await this.processarConsumos(manager, dto.consumos, loteSalvo, gestores);
    const relations = [
      'operador',
      'produto',
      'produto.receita',
      'produto.receita.materiaPrima',
      'consumos',
      'consumos.insumoEstoque',
      'consumos.insumoEstoque.materiaPrima',
      'inspecao',
      'inspecao.inspetor',
    ];
    const loteCompleto = await managerFindOneOrFail(
      manager,
      Lote,
      { where: { id: loteSalvo.id }, relations },
      { entityName: 'Lote', statusCode: 500 },
    );
    this.dependencies.sseService.emitir('lote:criado', {
      id: loteCompleto.id,
      numero_lote: loteCompleto.numero_lote,
      status: loteCompleto.status,
    });
    return loteCompleto;
  }
}
