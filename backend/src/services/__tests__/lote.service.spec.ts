import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario, type Usuario } from '../../entities/Usuario.js';
import type { Requisitante } from '../../utils/auth.utils.js';
import type { CriarLoteDTO } from '../../dto/lote.dto.js';
import type { DataSource, Repository } from 'typeorm';
import type { Lote } from '../../entities/Lote.js';
import type { Produto } from '../../entities/Produto.js';
import type { NotificacaoService } from '../../services/notificacao.service.js';
import type { SseService } from '../../services/sse.service.js';

const mockProdutoRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
const mockEstoqueRepo = { findOneBy: jest.fn(), save: jest.fn() };
const mockUserRepo = {
  findOneBy: jest.fn().mockImplementation(() => Promise.resolve({ id: 1 })),
};
const mockLoteRepo = {
  count: jest.fn().mockImplementation(() => Promise.resolve(0)),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn().mockImplementation(() => Promise.resolve([])),
};
const mockNotificacaoService = { criarNotificacaoParaPerfis: jest.fn() };
const mockSseService = { emitir: jest.fn() };

const mockappDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Produto') return mockProdutoRepo;
    if (name === 'InsumoEstoque') return mockEstoqueRepo;
    if (name === 'Usuario') return mockUserRepo;
    if (name === 'Lote') return mockLoteRepo;
    return {};
  }),
  transaction: jest.fn(
    async (cb: (em: typeof mockManager) => Promise<unknown>) => await cb(mockManager),
  ),
};

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: mockappDataSource,
}));

const { LoteService: loteService } = await import('../lote.service.js');

let service: InstanceType<typeof loteService>;

function criarService() {
  jest.clearAllMocks();
  const loteDeps = {
    loteRepo: mockLoteRepo as unknown as Repository<Lote>,
    produtoRepo: mockProdutoRepo as unknown as Repository<Produto>,
    usuarioRepo: mockUserRepo as unknown as Repository<Usuario>,
    notificacaoService: mockNotificacaoService as unknown as NotificacaoService,
    dataSource: mockappDataSource as unknown as DataSource,
    sseService: mockSseService as unknown as SseService,
    tempoProducaoMinutos: 30,
  };
  return new loteService(loteDeps);
}

const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };
const dtoMock: CriarLoteDTO = {
  produto_id: 1,
  quantidade_planejada: 10,
  turno: 'manha',
  data_producao: new Date(),
  data_validade: null,
  consumos: [{ insumo_estoque_id: 100, quantidade_consumida: 5 }],
  observacoes: '',
};

describe('Segurança e Permissões', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve impedir que um INSPETOR crie um lote', async () => {
    const requisitante: Requisitante = { id: 1, perfil: PerfilUsuario.INSPETOR };
    await expect(service.criar({} as CriarLoteDTO, requisitante)).rejects.toThrow(
      /Acesso negado/,
    );
  });
});

describe('criar - validações de referência', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve lançar erro se o produto não for encontrado', async () => {
    (mockProdutoRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(null),
    );

    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(AppError);
    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
      'Produto não encontrado(a).',
    );
  });

  it('deve lançar erro se o insumo não for encontrado no estoque', async () => {
    (mockProdutoRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1, nome: 'Produto Teste', ativo: true }),
    );
    (mockManager.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(null),
    );

    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
      'Lote de insumo ID 100 não encontrado(a).',
    );
  });
});

describe('criar - validações de estado do insumo', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve lançar erro se o insumo estiver inativo', async () => {
    (mockProdutoRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1, nome: 'Produto Teste', ativo: true }),
    );
    (mockManager.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        id: 100,
        ativo: false,
        materiaPrima: { nome: 'Insumo Inativo' },
      }),
    );

    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
      /está inativo/,
    );
  });

  it('deve lançar erro se tentar consumo fracionado para unidade UN', async () => {
    (mockProdutoRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1, nome: 'Produto Teste', ativo: true }),
    );
    (mockManager.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        id: 100,
        ativo: true,
        materiaPrima: { nome: 'Item UN', unidade_medida: 'UN' },
      }),
    );

    const dtoInvalido = {
      ...dtoMock,
      consumos: [{ insumo_estoque_id: 100, quantidade_consumida: 1.5 }],
    };

    await expect(
      service.criar(dtoInvalido as CriarLoteDTO, requisitanteMock),
    ).rejects.toThrow(/não aceita consumo de lote fracionado/);
  });
});

describe('criar - verificação de saldo', () => {
  beforeEach(() => {
    service = criarService();
    (mockProdutoRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1, nome: 'Produto Teste', percentual_ressalva: 10, ativo: true }),
    );
  });

  it('deve lançar erro se tentar consumir mais insumo do que o disponível', async () => {
    (mockManager.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        id: 100,
        quantidade_atual: 3,
        ativo: true,
        materiaPrima: { unidade_medida: 'UN' },
      }),
    );

    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
      /Saldo insuficiente no lote/,
    );
  });
});

describe('criar - criação bem-sucedida', () => {
  beforeEach(() => {
    service = criarService();
    (mockProdutoRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1, nome: 'Produto Teste', percentual_ressalva: 10, ativo: true }),
    );
  });

  it('deve criar o lote e abater o estoque corretamente', async () => {
    const estoqueMock = {
      id: 100,
      quantidade_atual: 20,
      quantidade_inicial: 20,
      ativo: true,
      materiaPrima: { nome: 'MP', unidade_medida: 'UN' },
    };

    const loteSalvoMock = { id: 50, numero_lote: 'LOT-01012026-1' };
    (mockManager.create as unknown as jest.Mock).mockReturnValue(loteSalvoMock);
    (mockManager.save as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(loteSalvoMock),
    );
    (mockManager.findOne as unknown as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve(estoqueMock))
      .mockImplementationOnce(() => Promise.resolve(loteSalvoMock));
    (mockLoteRepo.count as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(0),
    );

    const resultado = await service.criar(dtoMock, requisitanteMock);

    expect(resultado).toBeDefined();
    expect(mockappDataSource.transaction).toHaveBeenCalled();
    expect(estoqueMock.quantidade_atual).toBe(15);
  });
});

describe('buscarPorId', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve retornar o lote completo se encontrado', async () => {
    const mockLote = { id: 1, numero_lote: 'LOT-123' };
    (mockLoteRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(mockLote),
    );

    const result = await service.buscarPorId(1, {
      id: 1,
      perfil: PerfilUsuario.GESTOR,
    });
    expect(result.numero_lote).toBe('LOT-123');
  });

  it('deve lançar erro 404 se o lote não existir', async () => {
    (mockLoteRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(null),
    );
    await expect(
      service.buscarPorId(999, { id: 1, perfil: PerfilUsuario.GESTOR }),
    ).rejects.toThrow('Lote não encontrado.');
  });
});

describe('obterContagemPorStatus', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve agrupar e retornar as contagens corretamente', async () => {
    const mockRaw = [
      { status: 'em_producao', count: '5' },
      { status: 'aprovado', count: '10' },
    ];

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockImplementation(() => Promise.resolve(mockRaw)),
    };

    (mockLoteRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );

    const result = await service.obterContagemPorStatus({
      id: 1,
      perfil: PerfilUsuario.GESTOR,
    });

    expect(result['em_producao']).toBe(5);
    expect(result['aprovado']).toBe(10);
    expect(result['todos']).toBe(15);
  });
});

describe('buscarSugestoes - resultados', () => {
  const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };

  const mockLoteQB = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockProdutoQB = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(() => {
    service = criarService();
    (mockLoteRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(mockLoteQB);
    (mockProdutoRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      mockProdutoQB,
    );
  });

  it('deve retornar lotes e produtos combinados com os tipos corretos', async () => {
    (mockLoteQB.getMany as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([{ id: 1, numero_lote: 'LOT-01012026-1', status: 'em_producao' }]),
    );
    (mockProdutoQB.getMany as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([{ id: 10, nome: 'Produto A', sku: 'PA-001' }]),
    );

    const result = await service.buscarSugestoes('LOT', requisitanteMock);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ tipo: 'lote', label: 'LOT-01012026-1', id: 1 });
    expect(result[1]).toMatchObject({ tipo: 'produto', label: 'Produto A', id: 10 });
  });

  it('deve retornar lista vazia quando nenhum resultado bater', async () => {
    (mockLoteQB.getMany as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([]),
    );
    (mockProdutoQB.getMany as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([]),
    );

    const result = await service.buscarSugestoes('xyz_inexistente', requisitanteMock);

    expect(result).toHaveLength(0);
  });
});

describe('buscarSugestoes - permissões', () => {
  const mockLoteQB = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockProdutoQB = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(() => {
    service = criarService();
    (mockLoteRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(mockLoteQB);
    (mockProdutoRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      mockProdutoQB,
    );
    (mockLoteQB.getMany as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([]),
    );
    (mockProdutoQB.getMany as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([]),
    );
  });

  it('deve permitir que GESTOR acesse sugestões', async () => {
    const requisitanteGestor: Requisitante = { id: 2, perfil: PerfilUsuario.GESTOR };

    await expect(
      service.buscarSugestoes('test', requisitanteGestor),
    ).resolves.toBeDefined();
  });
});
