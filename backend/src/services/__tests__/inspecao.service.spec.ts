import { jest } from '@jest/globals';
import { PerfilUsuario, type Usuario } from '../../entities/Usuario.js';
import { LoteStatus, type Lote } from '../../entities/Lote.js';
import type { DataSource, Repository } from 'typeorm';
import type { Inspecao } from '../../entities/Inspecao.js';
import type { Requisitante } from '../../utils/auth.utils.js';

const mockInspecaoRepo = { findOneBy: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockLoteRepo = { findOne: jest.fn(), save: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn() };
const mockManager = { create: jest.fn(), save: jest.fn() };

const mockAppDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Inspecao') return mockInspecaoRepo;
    if (name === 'Lote') return mockLoteRepo;
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

const { InspecaoService: inspecaoService } = await import('../inspecao.service.js');

describe('InspecaoService', () => {
  let service: InstanceType<typeof inspecaoService>;
  const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.INSPETOR };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new inspecaoService(
      mockInspecaoRepo as unknown as Repository<Inspecao>,
      mockLoteRepo as unknown as Repository<Lote>,
      mockUserRepo as unknown as Repository<Usuario>,
      mockAppDataSource as unknown as DataSource,
    );
  });

  describe('registrar', () => {
    const dtoMock = { quantidade_reprovada: 5, descricao_desvio: 'Teste' };

    it('deve lançar erro se o lote não existir', async () => {
      mockLoteRepo.findOne.mockImplementation(() => Promise.resolve(null));
      await expect(
        service.registrar({ loteId: 1, dto: dtoMock, requisitante: requisitanteMock }),
      ).rejects.toThrow('Lote não encontrado(a).');
    });

    it('deve lançar erro se o lote não estiver aguardando inspeção', async () => {
      mockLoteRepo.findOne.mockImplementation(() =>
        Promise.resolve({ id: 1, status: LoteStatus.EM_PRODUCAO }),
      );
      await expect(
        service.registrar({ loteId: 1, dto: dtoMock, requisitante: requisitanteMock }),
      ).rejects.toThrow(/Só é possível inspecionar lotes com status/);
    });

    it('deve calcular APROVADO quando zero reprovados', async () => {
      const loteMock = {
        id: 1,
        status: LoteStatus.AGUARDANDO_INSPECAO,
        quantidade_planejada: 100,
        produto: { percentual_ressalva: 10 },
      };
      mockLoteRepo.findOne.mockImplementation(() => Promise.resolve(loteMock));
      mockInspecaoRepo.findOneBy.mockImplementation(() => Promise.resolve(null));
      mockUserRepo.findOneBy.mockImplementation(() => Promise.resolve({ id: 1 }));
      mockManager.create.mockReturnValue({ resultado_calculado: 'aprovado' });

      await service.registrar({
        loteId: 1,
        dto: { quantidade_reprovada: 0, descricao_desvio: '' },
        requisitante: requisitanteMock,
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resultado_calculado: 'aprovado',
        }),
      );
    });

    it('deve calcular REPROVADO quando taxa excede ressalva', async () => {
      const loteMock = {
        id: 1,
        status: LoteStatus.AGUARDANDO_INSPECAO,
        quantidade_planejada: 100,
        produto: { percentual_ressalva: 10 },
      };
      mockLoteRepo.findOne.mockImplementation(() => Promise.resolve(loteMock));
      mockInspecaoRepo.findOneBy.mockImplementation(() => Promise.resolve(null));
      mockUserRepo.findOneBy.mockImplementation(() => Promise.resolve({ id: 1 }));

      await service.registrar({
        loteId: 1,
        dto: { quantidade_reprovada: 15, descricao_desvio: '' },
        requisitante: requisitanteMock,
      }); // 15% > 10%

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resultado_calculado: 'reprovado',
        }),
      );
    });

    it('deve calcular APROVADO_RESTRICAO quando taxa está dentro da ressalva', async () => {
      const loteMock = {
        id: 1,
        status: LoteStatus.AGUARDANDO_INSPECAO,
        quantidade_planejada: 100,
        produto: { percentual_ressalva: 10 },
      };
      mockLoteRepo.findOne.mockImplementation(() => Promise.resolve(loteMock));
      mockInspecaoRepo.findOneBy.mockImplementation(() => Promise.resolve(null));
      mockUserRepo.findOneBy.mockImplementation(() => Promise.resolve({ id: 1 }));

      await service.registrar({
        loteId: 1,
        dto: { quantidade_reprovada: 5, descricao_desvio: '' },
        requisitante: requisitanteMock,
      }); // 5% <= 10%

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resultado_calculado: 'aprovado_restricao',
        }),
      );
    });
  });
});
