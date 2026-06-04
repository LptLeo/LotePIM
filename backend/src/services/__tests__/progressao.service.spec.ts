import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { LoteStatus, type Lote } from '../../entities/Lote.js';
import type { NotificacaoService } from '../notificacao.service.js';
import type { SseService } from '../sse.service.js';

const mockLoteRepo = {
  find: jest.fn<() => Promise<Lote[]>>(),
  save: jest.fn<(lote: Lote) => Promise<Lote>>(),
};
const mockNotificacaoService = { criarNotificacaoParaPerfis: jest.fn() };
const mockSseService = { emitir: jest.fn() };

const { ProgressaoService: progressaoService } = await import('../progressao.service.js');

describe('ProgressaoService', () => {
  let service: InstanceType<typeof progressaoService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new progressaoService(
      mockLoteRepo as unknown as Repository<Lote>,
      mockNotificacaoService as unknown as NotificacaoService,
      mockSseService as unknown as SseService,
    );
    process.env.TEMPO_PRODUCAO_MINUTOS = '2';
  });

  it('deve avançar lotes expirados e enviar notificação', async () => {
    const loteExpirado = {
      id: 1,
      numero_lote: 'L-01',
      status: LoteStatus.EM_PRODUCAO,
    } as unknown as Lote;
    mockLoteRepo.find.mockResolvedValue([loteExpirado]);

    await (service as unknown as { executar: () => Promise<void> }).executar();

    expect(loteExpirado.status).toBe(LoteStatus.AGUARDANDO_INSPECAO);
    expect(mockLoteRepo.save).toHaveBeenCalledWith(loteExpirado);
    expect(mockNotificacaoService.criarNotificacaoParaPerfis).toHaveBeenCalledWith(
      expect.stringContaining('L-01'),
      'inspecao',
      ['inspetor'],
      { link: '/app/lote/1' },
    );
    expect(mockSseService.emitir).toHaveBeenCalledWith('lote:status_alterado', {
      id: 1,
      status: LoteStatus.AGUARDANDO_INSPECAO,
    });
  });

  it('não deve fazer nada se não houver lotes expirados', async () => {
    mockLoteRepo.find.mockResolvedValue([]);

    await (service as unknown as { executar: () => Promise<void> }).executar();

    expect(mockLoteRepo.save).not.toHaveBeenCalled();
    expect(mockNotificacaoService.criarNotificacaoParaPerfis).not.toHaveBeenCalled();
    expect(mockSseService.emitir).not.toHaveBeenCalled();
  });
});
