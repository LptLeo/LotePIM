import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario, type Usuario } from '../../entities/Usuario.js';
import type { DataSource, Repository } from 'typeorm';
import type { Produto } from '../../entities/Produto.js';
import type { ReceitaItem } from '../../entities/ReceitaItem.js';
import type { MateriaPrima } from '../../entities/MateriaPrima.js';
import type { Requisitante } from '../../utils/auth.utils.js';
import type { NotificacaoService } from '../../services/notificacao.service.js';

const mockProdutoRepo = { findOneBy: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockReceitaRepo = { delete: jest.fn(), save: jest.fn() };
const mockMpRepo = { findOneBy: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn() };
const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

const mockAppDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Produto') return mockProdutoRepo;
    if (name === 'ReceitaItem') return mockReceitaRepo;
    if (name === 'MateriaPrima') return mockMpRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
  transaction: jest.fn(
    async (cb: (em: typeof mockManager) => Promise<unknown>) => await cb(mockManager),
  ),
};

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: mockAppDataSource,
}));

jest.unstable_mockModule('../notificacao.service.js', () => ({
  NotificacaoService: jest.fn().mockImplementation(() => ({
    criarNotificacaoParaPerfis: jest.fn(),
  })),
}));

const { ProdutoService: produtoService } = await import('../produto.service.js');

let service: InstanceType<typeof produtoService>;

function criarService() {
  mockUserRepo.findOneBy.mockImplementation(() => Promise.resolve({ id: 1 }));
  return new produtoService({
    produtoRepo: mockProdutoRepo as unknown as Repository<Produto>,
    receitaRepo: mockReceitaRepo as unknown as Repository<ReceitaItem>,
    mpRepo: mockMpRepo as unknown as Repository<MateriaPrima>,
    usuarioRepo: mockUserRepo as unknown as Repository<Usuario>,
    dataSource: mockAppDataSource as unknown as DataSource,
    notificacaoService: {
      criarNotificacaoParaPerfis: jest.fn(),
    } as unknown as NotificacaoService,
  });
}

describe('criar', () => {
  const requisitanteMock = { id: 1, perfil: PerfilUsuario.GESTOR };
  const dtoMock = {
    nome: 'Produto Teste',
    categoria: 'Categoria 1',
    linha_padrao: 'Linha A',
    percentual_ressalva: 10,
    ativo: true,
    receita: [{ materia_prima_id: 100, quantidade: 2, unidade: 'UN' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = criarService();
  });

  it('deve lançar erro se o criador não for encontrado', async () => {
    mockUserRepo.findOneBy.mockImplementation(() => Promise.resolve(null));

    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(AppError);
    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
      'Criador não encontrado(a).',
    );
  });

  it('deve lançar erro se a matéria prima não for encontrada', async () => {
    mockMpRepo.findOneBy.mockImplementation(() => Promise.resolve(null));
    mockManager.save.mockImplementation(() => Promise.resolve({ id: 10 }));

    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(AppError);
    await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
      'Matéria-prima ID 100 não encontrado(a).',
    );
  });

  it('deve criar o produto e receita com sucesso', async () => {
    mockMpRepo.findOneBy.mockImplementation(() =>
      Promise.resolve({ id: 100, nome: 'MP 1' }),
    );

    const produtoSalvoMock = { id: 10, nome: 'Produto Teste' };
    mockManager.create.mockReturnValue(produtoSalvoMock);
    mockManager.save.mockImplementation(() => Promise.resolve(produtoSalvoMock));

    const produtoCompletoMock = {
      id: 10,
      nome: 'Produto Teste',
      sku: 'PRD-PRODUTOTESTE',
      receita: [],
    };
    mockManager.findOne.mockImplementation(() => Promise.resolve(produtoCompletoMock));

    const result = await service.criar(dtoMock, requisitanteMock);

    expect(result).toBeDefined();
    expect(result.id).toBe(10);
    expect(mockAppDataSource.transaction).toHaveBeenCalled();
  });
});

describe('alternarStatus', () => {
  const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };

  beforeEach(() => {
    jest.clearAllMocks();
    service = criarService();
  });

  it('deve lançar erro se o produto não for encontrado', async () => {
    mockProdutoRepo.findOneBy.mockImplementation(() => Promise.resolve(null));
    await expect(service.alternarStatus(1, false, requisitanteMock)).rejects.toThrow(
      AppError,
    );
    await expect(service.alternarStatus(1, false, requisitanteMock)).rejects.toThrow(
      'Produto não encontrado.',
    );
  });

  it('deve alterar o status e retornar o produto atualizado', async () => {
    const produtoMock = { id: 1, ativo: true };
    mockProdutoRepo.findOneBy.mockImplementation(() => Promise.resolve(produtoMock));

    const produtoAtualizadoMock = { id: 1, ativo: false };
    mockProdutoRepo.findOne.mockImplementation(() =>
      Promise.resolve(produtoAtualizadoMock),
    );

    const result = await service.alternarStatus(1, false, requisitanteMock);

    expect(mockProdutoRepo.save).toHaveBeenCalledWith({ id: 1, ativo: false });
    expect(result.ativo).toBe(false);
  });
});
