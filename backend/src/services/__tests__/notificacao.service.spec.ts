import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { TipoNotificacao, type Notificacao } from '../../entities/Notificacao.js';
import { PerfilUsuario, type Usuario } from '../../entities/Usuario.js';
import type { Repository } from 'typeorm';

const mockNotifRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockUserRepo = { createQueryBuilder: jest.fn() };

const mockappDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Notificacao') return mockNotifRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
};

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: mockappDataSource,
}));

const { NotificacaoService: notificacaoService } =
  await import('../notificacao.service.js');

describe('NotificacaoService', () => {
  let service: InstanceType<typeof notificacaoService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new notificacaoService(
      mockNotifRepo as unknown as Repository<Notificacao>,
      mockUserRepo as unknown as Repository<Usuario>,
    );
  });

  describe('marcarComoLida', () => {
    it('deve lançar erro se a notificação não existir para o usuário', async () => {
      (mockNotifRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
        Promise.resolve(null),
      );

      await expect(service.marcarComoLida(1, 10)).rejects.toThrow(AppError);
    });

    it('deve marcar a notificação como lida', async () => {
      const mockNotif = { id: 1, lida: false };
      (mockNotifRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
        Promise.resolve(mockNotif),
      );
      (mockNotifRepo.save as unknown as jest.Mock).mockImplementation(() =>
        Promise.resolve({ ...mockNotif, lida: true }),
      );

      const result = await service.marcarComoLida(1, 10);
      expect(result.lida).toBe(true);
      expect(mockNotifRepo.save).toHaveBeenCalled();
    });
  });

  describe('criarNotificacaoParaPerfis', () => {
    it('deve buscar usuários pelos perfis e salvar múltiplas notificações', async () => {
      const mockUsers = [{ id: 1 }, { id: 2 }];
      const mockQB = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockImplementation(() => Promise.resolve(mockUsers)),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQB);

      await service.criarNotificacaoParaPerfis('Mensagem', TipoNotificacao.SISTEMA, [
        PerfilUsuario.GESTOR,
      ]);

      expect(mockNotifRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ mensagem: 'Mensagem', usuario: { id: 1 } }),
          expect.objectContaining({ mensagem: 'Mensagem', usuario: { id: 2 } }),
        ]),
      );
    });
  });
});
