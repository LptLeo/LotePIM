import { jest } from '@jest/globals';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { Requisitante } from '../../utils/auth.utils.js';
import type { Repository } from 'typeorm';
import type { Lote } from '../../entities/Lote.js';
import type { ConsumoInsumo } from '../../entities/ConsumoInsumo.js';
import type { InsumoEstoque } from '../../entities/InsumoEstoque.js';

const mockLoteRepo = { createQueryBuilder: jest.fn() };
const mockInsumoRepo = { createQueryBuilder: jest.fn(), findOne: jest.fn() };
const mockConsumoRepo = { createQueryBuilder: jest.fn() };

const mockappDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Lote') return mockLoteRepo;
    if (name === 'InsumoEstoque') return mockInsumoRepo;
    if (name === 'ConsumoInsumo') return mockConsumoRepo;
    return {};
  }),
};

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: mockappDataSource,
}));

const { RastreabilidadeService: rastreabilidadeService } =
  await import('../rastreabilidade.service.js');

let service: InstanceType<typeof rastreabilidadeService>;
const req: Requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };
const query = { pagina: 1, limite: 10 };

describe('consultarPorLote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service = new rastreabilidadeService(
      mockLoteRepo as unknown as Repository<Lote>,
      mockConsumoRepo as unknown as Repository<ConsumoInsumo>,
      mockInsumoRepo as unknown as Repository<InsumoEstoque>,
    );
  });

  it('deve retornar dados do lote quando o termo inicia com LOT-', async () => {
    const mockQB = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ id: 1, numero_lote: 'LOT-123' })),
    };
    mockLoteRepo.createQueryBuilder.mockReturnValue(mockQB as unknown);

    const result = (await service.consultar('LOT-123', query, req)) as unknown as {
      tipo: 'lote';
      resultado: { numero_lote: string };
    };

    expect(result.tipo).toBe('lote');
    expect(result.resultado.numero_lote).toBe('LOT-123');
  });

  it('deve lançar erro se nenhum lote for encontrado', async () => {
    const mockQB = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => Promise.resolve(null)),
    };
    mockLoteRepo.createQueryBuilder.mockReturnValue(mockQB as unknown);

    await expect(service.consultar('LOT-999', query, req)).rejects.toThrow(
      /Nenhum lote encontrado/,
    );
  });
});

describe('consultarPorInsumo', () => {
  it('deve retornar dados do insumo quando o termo NÃO inicia com LOT-', async () => {
    jest.clearAllMocks();
    service = new rastreabilidadeService(
      mockLoteRepo as unknown as Repository<Lote>,
      mockConsumoRepo as unknown as Repository<ConsumoInsumo>,
      mockInsumoRepo as unknown as Repository<InsumoEstoque>,
    );
    (mockInsumoRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 10, numero_lote_interno: 'INS-123' }),
    );

    const mockQBCount = {
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockImplementation(() => Promise.resolve([{ lote_id: 1 }])),
    };

    const mockQBData = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            lote: {
              id: 1,
              numero_lote: 'L-1',
              produto: { nome: 'P' },
              data_producao: new Date(),
            },
            insumoEstoque: {
              materiaPrima: { nome: 'MP' },
              numero_lote_interno: 'INS-1',
            },
          },
        ]),
      ),
    };

    mockConsumoRepo.createQueryBuilder
      .mockReturnValueOnce(mockQBCount as unknown)
      .mockReturnValueOnce(mockQBData as unknown);

    const result = (await service.consultar('INS-123', query, req)) as unknown as {
      tipo: 'insumo';
      resultado: { itens: unknown[] };
    };

    expect(result.tipo).toBe('insumo');
    expect(result.resultado.itens.length).toBe(1);
  });
});
