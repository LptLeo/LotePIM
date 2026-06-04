import { jest } from '@jest/globals';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { Repository } from 'typeorm';
import type { Lote } from '../../entities/Lote.js';

const mockLoteRepo = {
  count: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockAppDataSource = {
  getRepository: jest.fn(() => mockLoteRepo),
};

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: mockAppDataSource,
}));

const { MetricasService: metricasService } = await import('../metricas.service.js');

describe('MetricasService', () => {
  let service: InstanceType<typeof metricasService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new metricasService(mockLoteRepo as unknown as Repository<Lote>);
  });

  describe('obterDashboard', () => {
    const requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve calcular a tendência de unidades produzidas corretamente', async () => {
      // Mock de contagem de lotes
      mockLoteRepo.count.mockImplementation(() => Promise.resolve(10));

      // Mock de unidades
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve({ total: '100' })) // Atual
          .mockImplementationOnce(() => Promise.resolve({ total: '50' })), // Passado
        getRawMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      };

      mockLoteRepo.createQueryBuilder.mockReturnValue(mockQB);
      mockLoteRepo.find.mockImplementation(() => Promise.resolve([]));

      const result = await service.obterDashboard(requisitante, 'mes', 'mes');

      expect(result.unidades_mes).toBe(100);
      expect(result.unidades_tendencia).toBe(100); // (100-50)/50 * 100
    });

    it('deve retornar taxa de aprovação 0 se não houver inspeções', async () => {
      mockLoteRepo.count.mockImplementation(() => Promise.resolve(0));
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockImplementation(() => Promise.resolve({ total: '0' })),
        getRawMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      };
      mockLoteRepo.createQueryBuilder.mockReturnValue(mockQB);
      mockLoteRepo.find.mockImplementation(() => Promise.resolve([]));

      const result = await service.obterDashboard(requisitante);
      expect(result.taxa_aprovacao_mes).toBe(0);
    });
  });
});
