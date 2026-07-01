import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import {
  InsumoEstoqueStatus,
  Turno,
  type InsumoEstoque,
} from '../../entities/InsumoEstoque.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { Requisitante } from '../../utils/auth.utils.js';
import type { DataSource, Repository } from 'typeorm';
import type { NotificacaoService } from '../../services/notificacao.service.js';
import type { SseService } from '../../services/sse.service.js';

import type {
  CriarInsumoEstoqueDTO,
  CriarInsumoEstoqueBulkDTO,
} from '../../dto/insumoEstoque.dto.js';

const mockInsumoRepo = {
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockMpRepo = {
  findOneBy: jest.fn(),
  findBy: jest.fn(),
};

const mockUserRepo = {
  findOneBy: jest.fn(),
};

const mockEntityManager = {
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'InsumoEstoque') return mockInsumoRepo;
    if (name === 'MateriaPrima') return mockMpRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
};

const mockSseService = {
  emitir: jest.fn(),
};

const mockNotificacaoServiceInstance = {
  criarNotificacaoParaPerfis: jest.fn(() => Promise.resolve()),
};

jest.unstable_mockModule('../../services/sse.service.js', () => ({
  SseService: jest.fn().mockImplementation(() => mockSseService),
}));

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: {
    transaction: jest.fn((callback: (em: unknown) => unknown) =>
      callback(mockEntityManager),
    ),
    getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
      const name = (entity as { name?: string }).name || (entity as string);
      if (name === 'InsumoEstoque') return mockInsumoRepo;
      if (name === 'MateriaPrima') return mockMpRepo;
      if (name === 'Usuario') return mockUserRepo;
      return {};
    }),
  },
}));

jest.unstable_mockModule('../notificacao.service.js', () => ({
  NotificacaoService: jest.fn().mockImplementation(() => mockNotificacaoServiceInstance),
}));

const { InsumoEstoqueService: insumoEstoqueService } =
  await import('../insumoEstoque.service.js');
const { appDataSource } = await import('../../config/appDataSource.js');

let service: InstanceType<typeof insumoEstoqueService>;
const requisitante: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };

function criarService() {
  jest.clearAllMocks();
  (mockEntityManager.findOneBy as unknown as jest.Mock).mockImplementation(
    (entity: { name?: string } | string | unknown) => {
      const name = (entity as { name?: string }).name || (entity as string);
      if (name === 'Usuario') return Promise.resolve({ id: 1 });
      return Promise.resolve(null);
    },
  );
  return new insumoEstoqueService(
    mockInsumoRepo as unknown as Repository<InsumoEstoque>,
    mockNotificacaoServiceInstance as unknown as NotificacaoService,
    appDataSource as unknown as DataSource,
    mockSseService as unknown as SseService,
  );
}

describe('receberLoteInsumo', () => {
  const dto = {
    materia_prima_id: 100,
    quantidade_inicial: 50.5,
    fornecedor: 'Fornecedor Teste',
    turno: 'manha' as Turno,
  };

  beforeEach(() => {
    service = criarService();
  });

  it('deve lançar erro se a matéria prima não for encontrada', async () => {
    (mockEntityManager.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(null),
    );
    await expect(
      service.receberLoteInsumo(dto as unknown as CriarInsumoEstoqueDTO, requisitante),
    ).rejects.toThrow(AppError);
  });

  it('deve criar com sucesso', async () => {
    (mockEntityManager.findOneBy as unknown as jest.Mock).mockImplementation(
      (entity: { name?: string } | string | unknown) => {
        const name = (entity as { name?: string }).name || (entity as string);
        if (name === 'MateriaPrima')
          return Promise.resolve({ id: 100, unidade_medida: 'KG' });
        return Promise.resolve({ id: 1 });
      },
    );
    (mockEntityManager.count as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(5),
    );
    (mockEntityManager.create as unknown as jest.Mock).mockReturnValue({ id: 10 });
    (mockEntityManager.save as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 10 }),
    );

    const result = await service.receberLoteInsumo(
      dto as unknown as CriarInsumoEstoqueDTO,
      requisitante,
    );
    expect(result.id).toBe(10);
  });
});

describe('receberLoteInsumoBulk', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve usar bulk save com chunking', async () => {
    (mockEntityManager.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1 }),
    );
    (mockEntityManager.findBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve([{ id: 100, unidade_medida: 'KG' }]),
    );
    (mockEntityManager.save as unknown as jest.Mock).mockImplementation(
      (e: unknown, opt: unknown) => {
        expect(opt).toEqual({ chunk: 100 });
        return Promise.resolve(e);
      },
    );

    const itensBulk = [
      {
        materiaPrimaId: 100,
        quantidade_inicial: 1,
        fornecedor: 'A',
        turno: 'manha' as Turno,
      },
    ];
    const req: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };
    await service.receberLoteInsumoBulk(
      { itens: itensBulk } as unknown as CriarInsumoEstoqueBulkDTO,
      req,
    );
    expect(mockEntityManager.save).toHaveBeenCalled();
  });
});

describe('atualizarStatus', () => {
  beforeEach(() => {
    service = criarService();
  });

  it('deve disparar notificação ao mudar para disponivel', async () => {
    const insumoMock = {
      id: 1,
      status: InsumoEstoqueStatus.PENDENTE,
      materiaPrima: { nome: 'A' },
    };
    (mockInsumoRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(insumoMock),
    );
    (mockInsumoRepo.save as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(insumoMock),
    );

    const req: Requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };
    await service.atualizarStatus(1, InsumoEstoqueStatus.DISPONIVEL, req);
    expect(mockNotificacaoServiceInstance.criarNotificacaoParaPerfis).toHaveBeenCalled();
  });
});
