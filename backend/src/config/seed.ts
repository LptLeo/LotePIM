import { type EntityManager } from 'typeorm';
import { appDataSource } from './appDataSource.js';
import { Usuario, PerfilUsuario } from '../entities/Usuario.js';
import { MateriaPrima, UnidadeMedida } from '../entities/MateriaPrima.js';
import { Produto } from '../entities/Produto.js';
import { ReceitaItem } from '../entities/ReceitaItem.js';
import { InsumoEstoque, Turno } from '../entities/InsumoEstoque.js';
import { Lote, LoteStatus } from '../entities/Lote.js';
import { ConsumoInsumo } from '../entities/ConsumoInsumo.js';
import { Inspecao, ResultadoInspecao } from '../entities/Inspecao.js';
import { Notificacao, TipoNotificacao } from '../entities/Notificacao.js';
import { hashSenha } from '../utils/crypto.utils.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// === CONFIG ===

const CONFIG = {
  TOTAL_LOTES: Number(process.env.SEED_TOTAL_LOTES_PRODUCAO) || 180,
  MESES_HISTORICO: Number(process.env.SEED_MESES_HISTORICO) || 3,
  REPROVACAO_BASE_PCT: Number(process.env.SEED_REPROVACAO_BASE) || 10,
  REPROVACAO_VARIACAO_PCT: Number(process.env.SEED_REPROVACAO_VARIACAO) || 10,
  EXCEDENTE_ESTOQUE_PCT: Number(process.env.SEED_INSUMO_SURPLUS_PCT) || 35,
  SALT_ROUNDS: 12,
  LOTES_EM_ABERTO: 3,
  PRODUTOS_SEM_RECEITA: 2,
  TOTAL_PRODUTOS: 25,
};

// === CATÁLOGOS ===

const CATALOGO_MATERIAS_PRIMAS = [
  {
    nome: 'Painel LCD 14"',
    sku_interno: 'MP-LCD14',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Displays',
  },
  {
    nome: 'Painel LED 27"',
    sku_interno: 'MP-LED27',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Displays',
  },
  {
    nome: 'Placa Mãe ATX Z790',
    sku_interno: 'MP-MB-Z790',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Eletrônicos',
  },
  {
    nome: 'Placa Mãe mATX B660',
    sku_interno: 'MP-MB-B660',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Eletrônicos',
  },
  {
    nome: 'Fonte ATX 650W',
    sku_interno: 'MP-FONTE650W',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Alimentação',
  },
  {
    nome: 'Fonte SFX 450W',
    sku_interno: 'MP-FONTE450W',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Alimentação',
  },
  {
    nome: 'Gabinete Gamer RGB',
    sku_interno: 'MP-GAB-RGB',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Estrutura',
  },
  {
    nome: 'Cooler Processador',
    sku_interno: 'MP-COOLER',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Refrigeração',
  },
  {
    nome: 'Pasta Térmica Pro',
    sku_interno: 'MP-PASTA',
    unidade_medida: UnidadeMedida.G,
    categoria: 'Refrigeração',
  },
  {
    nome: 'Cabo HDMI 2.1',
    sku_interno: 'MP-HDMI',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Cabos',
  },
  {
    nome: 'Parafuso M3',
    sku_interno: 'MP-PAR-M3',
    unidade_medida: UnidadeMedida.UN,
    categoria: 'Fixação',
  },
];

const CATALOGO_USUARIOS = [
  { nome: 'Admin Gestor', email: 'gestor@lotepim.com', perfil: PerfilUsuario.GESTOR },
  {
    nome: 'Carlos Operador',
    email: 'operador@lotepim.com',
    perfil: PerfilUsuario.OPERADOR,
  },
  {
    nome: 'Ana Inspetora',
    email: 'inspetor@lotepim.com',
    perfil: PerfilUsuario.INSPETOR,
  },
  {
    nome: 'Marcos Operador 2',
    email: 'operador2@lotepim.com',
    perfil: PerfilUsuario.OPERADOR,
  },
  {
    nome: 'Julia Inspetora 2',
    email: 'inspetor2@lotepim.com',
    perfil: PerfilUsuario.INSPETOR,
  },
];

// === FUNÇÕES AUXILIARES ===

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(inicio: Date, fim: Date): Date {
  return new Date(inicio.getTime() + Math.random() * (fim.getTime() - inicio.getTime()));
}

function formatarDataDDMMAAAA(data: Date): string {
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  return `${dia}${mes}${data.getFullYear()}`;
}

function resolverResultadoInspecao(status: LoteStatus): ResultadoInspecao {
  if (status === LoteStatus.REPROVADO) return ResultadoInspecao.REPROVADO;
  if (status === LoteStatus.APROVADO_RESTRICAO)
    return ResultadoInspecao.APROVADO_RESTRICAO;
  return ResultadoInspecao.APROVADO;
}

function calcularQuantidadeReprovada(status: LoteStatus, qtdPlanejada: number): number {
  if (status === LoteStatus.REPROVADO)
    return rand(Math.floor(qtdPlanejada * 0.2), qtdPlanejada);
  if (status === LoteStatus.APROVADO_RESTRICAO) return rand(1, 10);
  return 0;
}

interface DadosUsuarios {
  gestor: Usuario;
  operadores: Usuario[];
  inspetores: Usuario[];
}

interface DadosEstoqueSeed {
  materiasPrimas: MateriaPrima[];
  operadores: Usuario[];
}

interface DadosProducaoSeed {
  produtos: Produto[];
  operadores: Usuario[];
  inspetores: Usuario[];
  estoques: InsumoEstoque[];
}

// === ETAPA: USUÁRIOS ===

async function criarUsuarios(
  manager: EntityManager,
  senhaHash: string,
): Promise<DadosUsuarios> {
  logger.info('[seed] Criando usuários...');
  const repo = manager.getRepository(Usuario);

  const usuariosCriados = await Promise.all(
    CATALOGO_USUARIOS.map(async (dados) => {
      const existente = await repo.findOneBy({ email: dados.email });
      if (existente) return existente;
      return repo.save(
        repo.create({ ...dados, senha_hash: senhaHash, alerta_estoque_porcentagem: 20 }),
      );
    }),
  );

  const [gestor, operador1, inspetor1, operador2, inspetor2] =
    usuariosCriados as Usuario[];

  return {
    gestor: gestor!,
    operadores: [operador1!, operador2!],
    inspetores: [inspetor1!, inspetor2!],
  };
}

// === ETAPA: MATÉRIAS-PRIMAS ===

async function criarMateriasPrimas(manager: EntityManager): Promise<MateriaPrima[]> {
  logger.info('[seed] Criando catálogo de matérias-primas...');
  const repo = manager.getRepository(MateriaPrima);

  const novas: MateriaPrima[] = [];
  for (const dados of CATALOGO_MATERIAS_PRIMAS) {
    const existente = await repo.findOneBy({ sku_interno: dados.sku_interno });
    if (!existente) {
      novas.push(repo.create(dados));
    }
  }

  if (novas.length > 0) {
    await repo.save(novas);
  }

  return repo.find();
}

// === ETAPA: PRODUTOS E RECEITAS ===

async function criarProdutosEReceitas(
  manager: EntityManager,
  gestor: Usuario,
  materiasPrimas: MateriaPrima[],
): Promise<Produto[]> {
  logger.info('[seed] Criando catálogo de produtos e receitas...');
  const produtoRepo = manager.getRepository(Produto);
  const receitaRepo = manager.getRepository(ReceitaItem);
  const novos: Produto[] = [];
  for (let i = 1; i <= CONFIG.TOTAL_PRODUTOS; i++) {
    const sku = `PRD-MODEL-${i.toString().padStart(3, '0')}`;
    const existente = await produtoRepo.findOneBy({ sku });
    if (!existente) {
      novos.push(
        produtoRepo.create({
          nome: `Produto Modelo ${i}`,
          sku,
          categoria: i <= 10 ? 'Linha Gamer' : i <= 20 ? 'Linha Office' : 'Acessórios',
          linha_padrao: 'Industrial',
          percentual_ressalva: rand(5, 15),
          criadoPor: gestor,
        }),
      );
    }
  }

  if (novos.length > 0) await produtoRepo.save(novos);
  const todos = await produtoRepo.find();
  const limiteComReceita = todos.length - CONFIG.PRODUTOS_SEM_RECEITA;

  const receitas: ReceitaItem[] = [];
  for (let i = 0; i < limiteComReceita; i++) {
    const produto = todos[i]!;
    const qtdIngredientes = rand(2, 5);
    const ingredientes = [...materiasPrimas]
      .sort(() => 0.5 - Math.random())
      .slice(0, qtdIngredientes);

    for (const mp of ingredientes) {
      receitas.push(
        receitaRepo.create({
          produto,
          materiaPrima: mp,
          quantidade: mp.unidade_medida === UnidadeMedida.UN ? rand(1, 4) : 2,
          unidade: mp.unidade_medida,
        }),
      );
    }
  }

  if (receitas.length > 0) await receitaRepo.save(receitas, { chunk: 100 });
  return todos;
}

// === ETAPA: ESTOQUE ===

async function criarEstoqueInsumos(
  manager: EntityManager,
  dados: DadosEstoqueSeed,
  periodoInicio: Date,
  periodoFim: Date,
): Promise<InsumoEstoque[]> {
  logger.info('[seed] Abastecendo estoque de insumos...');
  const repo = manager.getRepository(InsumoEstoque);

  const jaExiste = (await repo.count()) > 0;
  if (jaExiste) {
    logger.info('[seed] Estoque já populado. Pulando etapa.');
    return repo.find({ relations: ['materiaPrima'], order: { recebido_em: 'ASC' } });
  }

  const { materiasPrimas, operadores } = dados;
  const estoques: InsumoEstoque[] = [];

  for (const mp of materiasPrimas) {
    const totalNecessario = (CONFIG.TOTAL_LOTES / materiasPrimas.length) * 100 * 5;
    const totalComExcedente = totalNecessario * (1 + CONFIG.EXCEDENTE_ESTOQUE_PCT / 100);
    const numLotes = rand(4, 8);
    const qtdPorLote =
      mp.unidade_medida === UnidadeMedida.UN
        ? Math.floor(totalComExcedente / numLotes)
        : totalComExcedente / numLotes;

    for (let j = 1; j <= numLotes; j++) {
      const dataRecebimento = randomDate(periodoInicio, periodoFim);
      estoques.push(
        repo.create({
          materiaPrima: mp,
          numero_lote_fornecedor: `FORN-${mp.sku_interno}-${j}`,
          numero_lote_interno: `INS-${formatarDataDDMMAAAA(dataRecebimento)}-${mp.id}${j}`,
          quantidade_inicial: qtdPorLote,
          quantidade_atual: qtdPorLote,
          fornecedor: 'Fornecedor Global PIM',
          turno: pick([Turno.MANHA, Turno.TARDE, Turno.NOITE]),
          operador: pick(operadores),
          recebido_em: dataRecebimento,
        }),
      );
    }
  }

  await repo.save(estoques, { chunk: 100 });
  return repo.find({ relations: ['materiaPrima'], order: { recebido_em: 'ASC' } });
}

// === ETAPA: HISTÓRICO DE PRODUÇÃO ===

interface MetadadoLote {
  produto: Produto;
  status: LoteStatus;
  isReprovado: boolean;
  qtdPlanejada: number;
}

interface ProcessarConsumoParams {
  manager: EntityManager;
  produto: Produto;
  lote: Lote;
  qtdPlanejada: number;
  estoques: InsumoEstoque[];
  saldoEstoque: Map<number, number>;
  consumos: ConsumoInsumo[];
}

interface ProcessarInspecaoParams {
  lote: Lote;
  status: LoteStatus;
  isReprovado: boolean;
  qtdPlanejada: number;
  inspetores: Usuario[];
  inspecoes: Inspecao[];
  manager: EntityManager;
}

interface ProcessarConsumosEInspecoesParams {
  manager: EntityManager;
  lotesSalvos: Lote[];
  metadadosLotes: MetadadoLote[];
  estoques: InsumoEstoque[];
  inspetores: Usuario[];
  saldoEstoque: Map<number, number>;
  consumos: ConsumoInsumo[];
  inspecoes: Inspecao[];
}

function criarLoteSeed(
  loteRepo: import('typeorm').Repository<Lote>,
  dados: {
    dataProd: Date;
    produto: Produto;
    qtdPlanejada: number;
    status: LoteStatus;
    i: number;
    operadores: Usuario[];
  },
): Lote {
  const { dataProd, produto, qtdPlanejada, status, i, operadores } = dados;
  return loteRepo.create({
    numero_lote: `LOT-${formatarDataDDMMAAAA(dataProd)}-${rand(100, 999)}${i}`,
    produto,
    quantidade_planejada: qtdPlanejada,
    status,
    turno: pick(['manha', 'tarde', 'noite']),
    operador: pick(operadores),
    data_producao: dataProd,
    aberto_em: dataProd,
    encerrado_em:
      status === LoteStatus.EM_PRODUCAO ? null : new Date(dataProd.getTime() + 120_000),
  });
}

function gerarStatusLote(eLoteEmAberto: boolean, isReprovado: boolean): LoteStatus {
  if (eLoteEmAberto) return LoteStatus.EM_PRODUCAO;
  if (isReprovado)
    return Math.random() > 0.5 ? LoteStatus.REPROVADO : LoteStatus.APROVADO_RESTRICAO;
  return LoteStatus.APROVADO;
}

async function gerarLotes(
  manager: EntityManager,
  dados: DadosProducaoSeed,
  periodoInicio: Date,
  periodoFim: Date,
): Promise<{ lotesSalvos: Lote[]; metadadosLotes: MetadadoLote[] }> {
  const loteRepo = manager.getRepository(Lote);
  if ((await loteRepo.count()) > 0) {
    logger.info('[seed] Lotes já existem. Pulando geração de histórico.');
    return { lotesSalvos: [], metadadosLotes: [] };
  }

  logger.info(`[seed] Gerando ${CONFIG.TOTAL_LOTES} lotes de produção...`);
  const { produtos, operadores } = dados;

  const produtosComReceita = (
    await manager
      .getRepository(Produto)
      .find({ relations: ['receita', 'receita.materiaPrima'] })
  ).filter((p) => p.receita && p.receita.length > 0);

  const lotesParaSalvar: Lote[] = [];
  const metadadosLotes: MetadadoLote[] = [];
  for (let i = 0; i < CONFIG.TOTAL_LOTES; i++) {
    const eLoteEmAberto = i < CONFIG.LOTES_EM_ABERTO;
    const dataProd = eLoteEmAberto ? periodoFim : randomDate(periodoInicio, periodoFim);
    const produto = eLoteEmAberto ? produtos[i]! : pick(produtosComReceita);
    const qtdPlanejada = rand(30, 200);

    const taxaReprovacao =
      CONFIG.REPROVACAO_BASE_PCT +
      (Math.random() * 2 * CONFIG.REPROVACAO_VARIACAO_PCT -
        CONFIG.REPROVACAO_VARIACAO_PCT);
    const isReprovado = Math.random() * 100 < taxaReprovacao;
    const status = gerarStatusLote(eLoteEmAberto, isReprovado);

    lotesParaSalvar.push(
      criarLoteSeed(loteRepo, { dataProd, produto, qtdPlanejada, status, i, operadores }),
    );

    metadadosLotes.push({ produto, status, isReprovado, qtdPlanejada });
  }
  logger.info(`[seed] Inserindo ${lotesParaSalvar.length} lotes no banco...`);
  const lotesSalvos = await loteRepo.save(lotesParaSalvar, { chunk: 100 });

  return { lotesSalvos, metadadosLotes };
}

function processarConsumoReceita(params: ProcessarConsumoParams): void {
  const { manager, produto, lote, qtdPlanejada, estoques, saldoEstoque, consumos } =
    params;
  if (!produto.receita) return;

  const consumoRepo = manager.getRepository(ConsumoInsumo);

  for (const item of produto.receita) {
    const estoqueDisponivel = estoques.find(
      (e) =>
        e.materiaPrima.id === item.materiaPrima.id && (saldoEstoque.get(e.id) ?? 0) > 0,
    );

    if (!estoqueDisponivel) continue;

    let qtdConsumo = item.quantidade * qtdPlanejada;
    if (item.materiaPrima.unidade_medida === UnidadeMedida.UN) {
      qtdConsumo = Math.floor(qtdConsumo);
    }

    consumos.push(
      consumoRepo.create({
        lote,
        insumoEstoque: estoqueDisponivel,
        quantidade_consumida: qtdConsumo,
      }),
    );

    const saldoAtual = saldoEstoque.get(estoqueDisponivel.id) ?? 0;
    saldoEstoque.set(estoqueDisponivel.id, Math.max(0, saldoAtual - qtdConsumo));
  }
}

function processarInspecaoLote(params: ProcessarInspecaoParams): void {
  const { lote, status, isReprovado, qtdPlanejada, inspetores, inspecoes, manager } =
    params;
  if (status === LoteStatus.EM_PRODUCAO) return;

  const inspecaoRepo = manager.getRepository(Inspecao);

  inspecoes.push(
    inspecaoRepo.create({
      lote,
      inspetor: pick(inspetores),
      quantidade_reprovada: calcularQuantidadeReprovada(status, qtdPlanejada),
      resultado_calculado: resolverResultadoInspecao(status),
      descricao_desvio: isReprovado ? 'Desvio na linha de montagem.' : '',
      criado_em: new Date(lote.encerrado_em!.getTime() + 5_000),
    }),
  );
}

async function processarConsumosEInspecoes(
  params: ProcessarConsumosEInspecoesParams,
): Promise<void> {
  const {
    manager,
    lotesSalvos,
    metadadosLotes,
    estoques,
    inspetores,
    saldoEstoque,
    consumos,
    inspecoes,
  } = params;

  for (let i = 0; i < lotesSalvos.length; i++) {
    const lote = lotesSalvos[i]!;
    const { produto, status, isReprovado, qtdPlanejada } = metadadosLotes[i]!;

    processarConsumoReceita({
      manager,
      produto,
      lote,
      qtdPlanejada,
      estoques,
      saldoEstoque,
      consumos,
    });
    processarInspecaoLote({
      lote,
      status,
      isReprovado,
      qtdPlanejada,
      inspetores,
      inspecoes,
      manager,
    });
  }
}

async function criarHistoricoDeProducao(
  manager: EntityManager,
  dados: DadosProducaoSeed,
  periodoInicio: Date,
  periodoFim: Date,
): Promise<void> {
  const { lotesSalvos, metadadosLotes } = await gerarLotes(
    manager,
    dados,
    periodoInicio,
    periodoFim,
  );

  if (lotesSalvos.length === 0) return;

  logger.info('[seed] Processando consumos e inspeções...');

  const consumos: ConsumoInsumo[] = [];
  const inspecoes: Inspecao[] = [];
  const saldoEstoque = new Map(
    dados.estoques.map((e) => [e.id, Number(e.quantidade_atual)]),
  );

  await processarConsumosEInspecoes({
    manager,
    lotesSalvos,
    metadadosLotes,
    estoques: dados.estoques,
    inspetores: dados.inspetores,
    saldoEstoque,
    consumos,
    inspecoes,
  });

  logger.info(
    `[seed] Inserindo ${consumos.length} consumos e ${inspecoes.length} inspeções...`,
  );
  await manager.getRepository(ConsumoInsumo).save(consumos, { chunk: 500 });
  await manager.getRepository(Inspecao).save(inspecoes, { chunk: 500 });

  logger.info('[seed] Atualizando saldos de estoque...');
  for (const estoque of dados.estoques) {
    estoque.quantidade_atual = saldoEstoque.get(estoque.id) ?? 0;
  }
  await manager.getRepository(InsumoEstoque).save(dados.estoques, { chunk: 100 });
}

// === ETAPA: NOTIFICAÇÕES ===

async function criarNotificacoes(
  manager: EntityManager,
  usuarios: DadosUsuarios,
): Promise<void> {
  logger.info('[seed] Gerando notificações iniciais...');
  const repo = manager.getRepository(Notificacao);

  const destinatarios = [
    usuarios.gestor,
    usuarios.operadores[0]!,
    usuarios.inspetores[0]!,
  ];

  const notificacoes: Notificacao[] = [];

  for (const u of destinatarios) {
    notificacoes.push(
      repo.create({
        usuario: u,
        tipo: TipoNotificacao.SISTEMA,
        mensagem: `Bem-vindo ao LotePIM, ${u.nome.split(' ')[0]}! O sistema está pronto para uso.`,
        lida: false,
      }),
    );

    if (u.perfil === PerfilUsuario.GESTOR) {
      notificacoes.push(
        repo.create({
          usuario: u,
          tipo: TipoNotificacao.ESTOQUE,
          mensagem: 'Alerta: O estoque de Painel LCD 14" está abaixo de 20%.',
          lida: false,
        }),
      );
    }
  }

  await repo.save(notificacoes);
}

// === ORQUESTRADOR ===

async function seed(): Promise<void> {
  logger.info(`[seed] Conectando ao banco: ${process.env.DB_HOST || 'localhost'}...`);

  try {
    await appDataSource.initialize();

    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setMonth(inicio.getMonth() - CONFIG.MESES_HISTORICO);

    const senhaHash = await hashSenha('senha123', CONFIG.SALT_ROUNDS);

    await appDataSource.transaction(async (manager) => {
      const usuarios = await criarUsuarios(manager, senhaHash);
      const materiasPrimas = await criarMateriasPrimas(manager);
      const produtos = await criarProdutosEReceitas(
        manager,
        usuarios.gestor,
        materiasPrimas,
      );
      const estoques = await criarEstoqueInsumos(
        manager,
        { materiasPrimas, operadores: usuarios.operadores },
        inicio,
        hoje,
      );

      await criarHistoricoDeProducao(
        manager,
        {
          produtos,
          operadores: usuarios.operadores,
          inspetores: usuarios.inspetores,
          estoques,
        },
        inicio,
        hoje,
      );

      await criarNotificacoes(manager, usuarios);
    });

    logger.info('\n[seed] Seed concluído com sucesso!');
  } catch (error) {
    logger.error('\n[seed] Erro durante o seed (transação revertida)', error);
  } finally {
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
    process.exit(0);
  }
}

void seed();
