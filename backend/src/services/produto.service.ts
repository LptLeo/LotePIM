import {
  type Repository,
  type EntityManager,
  type DataSource,
  type SelectQueryBuilder,
} from 'typeorm';
import { Produto } from '../entities/Produto.js';
import { ReceitaItem } from '../entities/ReceitaItem.js';
import { MateriaPrima } from '../entities/MateriaPrima.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { MSG } from '../errors/errorMessages.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import type { CriarProdutoDTO, AtualizarReceitaDTO } from '../dto/produto.dto.js';
import { NotificacaoService } from './notificacao.service.js';
import { TipoNotificacao } from '../entities/Notificacao.js';
import {
  formatarRespostaPaginada,
  type PaginacaoQueryDto,
  type RespostaPaginada,
} from '../dto/paginacao.dto.js';
import { gerarSku, garantirSkuUnico } from '../utils/sku.utils.js';
import {
  findOneByOrFail,
  findOneOrFail,
  listarColunasDistintas,
  managerFindOneOrFail,
} from '../utils/orm.utils.js';

// === INTERFACE DE DEPENDÊNCIAS ===

interface ProdutoDependencies {
  produtoRepo: Repository<Produto>;
  receitaRepo: Repository<ReceitaItem>;
  mpRepo: Repository<MateriaPrima>;
  usuarioRepo: Repository<Usuario>;
  dataSource: DataSource;
  notificacaoService: NotificacaoService;
}

interface ProdutoListarQuery extends PaginacaoQueryDto {
  categoria?: string | undefined;
  status?: string | undefined;
  ordenacao?: string | undefined;
  linha?: string | undefined;
}

const FILTROS_STATUS: Record<string, (qb: SelectQueryBuilder<Produto>) => string> = {
  ativos: () => 'produto.ativo = true',
  inativos: () => 'produto.ativo = false',
};
FILTROS_STATUS['com_insumos'] = (qb) =>
  `EXISTS ${qb.subQuery().select('1').from(ReceitaItem, 'r').where('r.produto_id = produto.id').getQuery()}`;
FILTROS_STATUS['sem_insumos'] = (qb) =>
  `NOT EXISTS ${qb.subQuery().select('1').from(ReceitaItem, 'r').where('r.produto_id = produto.id').getQuery()}`;

type OrdenacaoConfig = {
  subQuery?: (qb: SelectQueryBuilder<Produto>) => string;
  alias?: string;
  campo?: string;
  order: 'ASC' | 'DESC';
};

const ORDENACOES: Record<string, OrdenacaoConfig> = {
  mais_recentes: { campo: 'criado_em', order: 'DESC' },
  menos_recentes: { campo: 'criado_em', order: 'ASC' },
  mais_produzidos: {
    subQuery: (qb) =>
      qb
        .subQuery()
        .select('COALESCE(SUM(l.quantidade_planejada), 0)')
        .from('lote', 'l')
        .where('l.produto_id = produto.id')
        .getQuery(),
    alias: 'qtd_produzida',
    order: 'DESC',
  },
  menos_produzidos: {
    subQuery: (qb) =>
      qb
        .subQuery()
        .select('COALESCE(SUM(l.quantidade_planejada), 0)')
        .from('lote', 'l')
        .where('l.produto_id = produto.id')
        .getQuery(),
    alias: 'qtd_produzida',
    order: 'ASC',
  },
  mais_lotes: {
    subQuery: (qb) =>
      qb
        .subQuery()
        .select('COUNT(l.id)')
        .from('lote', 'l')
        .where('l.produto_id = produto.id')
        .getQuery(),
    alias: 'qtd_lotes',
    order: 'DESC',
  },
  menos_lotes: {
    subQuery: (qb) =>
      qb
        .subQuery()
        .select('COUNT(l.id)')
        .from('lote', 'l')
        .where('l.produto_id = produto.id')
        .getQuery(),
    alias: 'qtd_lotes',
    order: 'ASC',
  },
  mais_insumos: {
    subQuery: (qb) =>
      qb
        .subQuery()
        .select('COUNT(r.id)')
        .from('receita_item', 'r')
        .where('r.produto_id = produto.id')
        .getQuery(),
    alias: 'qtd_insumos',
    order: 'DESC',
  },
  menos_insumos: {
    subQuery: (qb) =>
      qb
        .subQuery()
        .select('COUNT(r.id)')
        .from('receita_item', 'r')
        .where('r.produto_id = produto.id')
        .getQuery(),
    alias: 'qtd_insumos',
    order: 'ASC',
  },
};

// === SERVIÇO ===

export class ProdutoService {
  constructor(private readonly dependencies: ProdutoDependencies) {}

  // === CRUD ===

  public async criar(dto: CriarProdutoDTO, requisitante: Requisitante): Promise<Produto> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const criador = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id: requisitante.id },
      'Criador',
      404,
    );

    const skuBase = gerarSku(dto.nome, 'PRD');
    const skuUnico = await garantirSkuUnico(
      this.dependencies.produtoRepo,
      'sku',
      skuBase,
    );

    return this.dependencies.dataSource.transaction((manager) =>
      this.executarCriacaoEmTransacao(manager, dto, criador, skuUnico),
    );
  }

  public async listar(
    query: ProdutoListarQuery,
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<Produto>> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const { pagina, limite } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.dependencies.produtoRepo
      .createQueryBuilder('produto')
      .leftJoinAndSelect('produto.receita', 'receita')
      .leftJoinAndSelect('receita.materiaPrima', 'materiaPrima')
      .leftJoinAndSelect('produto.criadoPor', 'criadoPor')
      .leftJoinAndSelect('produto.lotes', 'lotes')
      .skip(skip)
      .take(limite);

    this.aplicarFiltroBusca(queryBuilder, query.busca);
    this.aplicarFiltroString(queryBuilder, query.linha, 'produto.linha_padrao');
    this.aplicarFiltroString(queryBuilder, query.categoria, 'produto.categoria');
    this.aplicarFiltroStatus(queryBuilder, query.status);
    this.aplicarOrdenacao(queryBuilder, query.ordenacao);

    const [produtos, total] = await queryBuilder.getManyAndCount();
    return formatarRespostaPaginada([produtos, total], query);
  }

  public async buscarPorId(id: number, requisitante: Requisitante): Promise<Produto> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    return findOneOrFail(
      this.dependencies.produtoRepo,
      { where: { id }, relations: ['receita', 'receita.materiaPrima', 'criadoPor'] },
      MSG.produtoNaoEncontrado,
      404,
    );
  }

  public async listarCategorias(requisitante: Requisitante): Promise<string[]> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);
    return listarColunasDistintas<string>(
      this.dependencies.produtoRepo,
      'produto',
      'categoria',
    );
  }

  public async listarLinhas(requisitante: Requisitante): Promise<string[]> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);
    return listarColunasDistintas<string>(
      this.dependencies.produtoRepo,
      'produto',
      'linha_padrao',
    );
  }

  public async atualizarReceita(
    produtoId: number,
    dto: AtualizarReceitaDTO,
    requisitante: Requisitante,
  ): Promise<Produto> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await findOneByOrFail(
      this.dependencies.produtoRepo,
      { id: produtoId },
      MSG.produtoNaoEncontrado,
      404,
    );

    return this.dependencies.dataSource.transaction(async (manager) => {
      await manager.delete(ReceitaItem, { produto: { id: produtoId } });
      await this.processarItensReceita(manager, dto, produto);
      return this.buscarProdutoComRelacoes(manager, produtoId);
    });
  }

  public async alternarStatus(
    id: number,
    ativo: boolean,
    requisitante: Requisitante,
  ): Promise<Produto> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await findOneByOrFail(
      this.dependencies.produtoRepo,
      { id },
      MSG.produtoNaoEncontrado,
      404,
    );

    produto.ativo = ativo;
    await this.dependencies.produtoRepo.save(produto);

    return findOneOrFail(
      this.dependencies.produtoRepo,
      { where: { id }, relations: ['receita', 'receita.materiaPrima', 'criadoPor'] },
      MSG.produtoNaoEncontrado,
      500,
    );
  }

  public async obterContagem(
    requisitante: Requisitante,
  ): Promise<Record<string, number>> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const total = await this.dependencies.produtoRepo.count();
    const ativos = await this.dependencies.produtoRepo.count({ where: { ativo: true } });
    const inativos = await this.dependencies.produtoRepo.count({
      where: { ativo: false },
    });

    const semInsumos = await this.dependencies.produtoRepo
      .createQueryBuilder('p')
      .leftJoin('p.receita', 'receita')
      .where('receita.id IS NULL')
      .getCount();

    return {
      total,
      ativos,
      inativos,
      sem_insumos: semInsumos,
      mais_produzidos: 0,
    };
  }

  // === MÉTODOS PRIVADOS ===

  private async buscarProdutoComRelacoes(
    manager: EntityManager,
    id: number,
  ): Promise<Produto> {
    return managerFindOneOrFail(
      manager,
      Produto,
      {
        where: { id },
        relations: ['receita', 'receita.materiaPrima'],
      },
      { entityName: 'Produto' },
    );
  }

  private async processarItensReceita(
    manager: EntityManager,
    receita: CriarProdutoDTO['receita'],
    produtoSalvo: Produto,
  ): Promise<void> {
    if (!receita || receita.length === 0) return;

    const itensReceita = await Promise.all(
      receita.map(async (item) => {
        const mp = await findOneByOrFail(
          this.dependencies.mpRepo,
          { id: item.materia_prima_id },
          `Matéria-prima ID ${item.materia_prima_id}`,
          404,
        );

        return manager.create(ReceitaItem, {
          produto: produtoSalvo,
          materiaPrima: mp,
          quantidade: item.quantidade,
          unidade: item.unidade,
        });
      }),
    );
    await manager.save(itensReceita);
  }

  private async executarCriacaoEmTransacao(
    manager: EntityManager,
    dto: CriarProdutoDTO,
    criador: Usuario,
    skuUnico: string,
  ): Promise<Produto> {
    const produto = manager.create(Produto, {
      nome: dto.nome,
      sku: skuUnico,
      categoria: dto.categoria,
      linha_padrao: dto.linha_padrao,
      percentual_ressalva: dto.percentual_ressalva,
      ativo: dto.ativo,
      criadoPor: criador,
    });

    const produtoSalvo = await manager.save(produto);
    await this.processarItensReceita(manager, dto.receita, produtoSalvo);
    const produtoCompleto = await this.buscarProdutoComRelacoes(manager, produtoSalvo.id);

    await this.dependencies.notificacaoService.criarNotificacaoParaPerfis(
      `Novo produto disponível para produção: ${produtoCompleto.nome} (${produtoCompleto.sku})`,
      TipoNotificacao.PRODUTO,
      [PerfilUsuario.OPERADOR],
      { link: '/app/lote/novo', idRef: produtoCompleto.id },
    );

    return produtoCompleto;
  }

  // === FILTROS DE LISTAGEM ===

  private aplicarFiltroBusca(
    qb: SelectQueryBuilder<Produto>,
    busca: string | undefined,
  ): void {
    if (!busca) return;

    qb.andWhere('(produto.nome ILIKE :busca OR produto.sku ILIKE :busca)', {
      busca: `%${busca}%`,
    });
  }

  private aplicarFiltroString(
    qb: SelectQueryBuilder<Produto>,
    valor: string | undefined,
    coluna: string,
  ): void {
    if (!valor || valor === 'todas') return;

    qb.andWhere(`${coluna} = :${coluna.replace(/\./g, '_')}`, {
      [coluna.replace(/\./g, '_')]: valor,
    });
  }

  private aplicarFiltroStatus(
    qb: SelectQueryBuilder<Produto>,
    status: string | undefined,
  ): void {
    if (!status || status === 'todos') return;

    const whereRaw = FILTROS_STATUS[status];
    if (!whereRaw) return;

    qb.andWhere(whereRaw(qb));
  }

  private aplicarOrdenacao(
    qb: SelectQueryBuilder<Produto>,
    ordenacao: string | undefined,
  ): void {
    const config = ordenacao ? ORDENACOES[ordenacao] : undefined;

    if (!config) {
      qb.orderBy('produto.nome', 'ASC');
      return;
    }

    if (config.subQuery) {
      qb.addSelect(config.subQuery(qb), config.alias!);
      qb.orderBy(config.alias!, config.order);
    } else {
      qb.orderBy(`produto.${config.campo!}`, config.order);
    }
  }
}
