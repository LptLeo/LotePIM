import { jest } from '@jest/globals';
import { SseService, sseService } from '../sse.service.js';
import type { Response } from 'express';

let service: SseService;

function limparEstado() {
  (
    service as unknown as { clientes: Set<Response>; tickets: Map<string, unknown> }
  ).clientes.clear();
  (
    service as unknown as { clientes: Set<Response>; tickets: Map<string, unknown> }
  ).tickets.clear();
}

describe('Singleton e Instância', () => {
  it('deve retornar a mesma instância (Singleton)', () => {
    const instancia1 = sseService;
    const instancia2 = sseService;
    expect(instancia1).toBe(instancia2);
  });
});

describe('Gestão de Clientes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    service = sseService;
    limparEstado();
  });

  it('deve adicionar um cliente na lista', () => {
    const mockRes = {} as Response;
    service.adicionarCliente(mockRes);
    expect(
      (service as unknown as { clientes: Set<Response> }).clientes.has(mockRes),
    ).toBe(true);
  });

  it('deve remover um cliente da lista', () => {
    const mockRes = {} as Response;
    service.adicionarCliente(mockRes);
    service.removerCliente(mockRes);
    expect(
      (service as unknown as { clientes: Set<Response> }).clientes.has(mockRes),
    ).toBe(false);
  });
});

describe('Emitir Eventos', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    service = sseService;
    limparEstado();
  });

  it('deve emitir o evento para todos os clientes ativos', () => {
    const mockRes1 = { write: jest.fn() } as unknown as Response;
    const mockRes2 = { write: jest.fn() } as unknown as Response;

    service.adicionarCliente(mockRes1);
    service.adicionarCliente(mockRes2);

    const payload = { mensagem: 'teste' };
    service.emitir('meu-evento', payload);

    const expectedString = `event: meu-evento\ndata: {"mensagem":"teste"}\n\n`;

    expect(mockRes1.write).toHaveBeenCalledWith(expectedString);
    expect(mockRes2.write).toHaveBeenCalledWith(expectedString);
  });

  it('deve remover clientes em caso de erro na escrita (conexão morta)', () => {
    const mockResOk = { write: jest.fn() } as unknown as Response;
    const mockResDead = {
      write: jest.fn().mockImplementation(() => {
        throw new Error('EPIPE');
      }),
    } as unknown as Response;

    service.adicionarCliente(mockResOk);
    service.adicionarCliente(mockResDead);

    service.emitir('meu-evento', { test: true });

    expect(
      (service as unknown as { clientes: Set<Response> }).clientes.has(mockResOk),
    ).toBe(true);
    expect(
      (service as unknown as { clientes: Set<Response> }).clientes.has(mockResDead),
    ).toBe(false);
  });
});

describe('Gestão de Tickets', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    service = sseService;
    limparEstado();
  });

  it('deve gerar um ticket e validá-lo com sucesso', () => {
    const userId = 10;
    const ticket = service.gerarTicket(userId);

    expect(ticket).toBeDefined();
    expect(typeof ticket).toBe('string');

    const validado = service.validarTicket(ticket);
    expect(validado).toBe(userId);
  });

  it('deve retornar null para ticket inexistente', () => {
    const validado = service.validarTicket('ticket-falso');
    expect(validado).toBeNull();
  });

  it('deve consumir o ticket (uso único)', () => {
    const ticket = service.gerarTicket(10);

    const primeiraValidacao = service.validarTicket(ticket);
    expect(primeiraValidacao).toBe(10);

    const segundaValidacao = service.validarTicket(ticket);
    expect(segundaValidacao).toBeNull();
  });

  it('deve invalidar o ticket caso tenha expirado', () => {
    const ticket = service.gerarTicket(20);

    jest.advanceTimersByTime(31000);

    const validado = service.validarTicket(ticket);
    expect(validado).toBeNull();
  });
});

describe('Heartbeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    service = sseService;
    limparEstado();
  });

  it('deve enviar ping a cada 30 segundos', () => {
    const mockRes = { write: jest.fn() } as unknown as Response;
    service.adicionarCliente(mockRes);

    (service as unknown as { executarHeartbeat: () => void }).executarHeartbeat();

    expect(mockRes.write).toHaveBeenCalledWith(':ping\n\n');
  });

  it('deve remover cliente inativo detectado no heartbeat', () => {
    const mockResDead = {
      write: jest.fn().mockImplementation(() => {
        throw new Error('Conexão fechada');
      }),
    } as unknown as Response;

    service.adicionarCliente(mockResDead);

    (service as unknown as { executarHeartbeat: () => void }).executarHeartbeat();

    expect(
      (service as unknown as { clientes: Set<Response> }).clientes.has(mockResDead),
    ).toBe(false);
  });
});
