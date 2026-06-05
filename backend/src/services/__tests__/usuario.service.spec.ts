import { jest } from '@jest/globals';
import { PerfilUsuario, type Usuario } from '../../entities/Usuario.js';
import type { Repository } from 'typeorm';
import type { Lote } from '../../entities/Lote.js';
import type { Inspecao } from '../../entities/Inspecao.js';
import type { Produto } from '../../entities/Produto.js';

const mockUserRepo = {
  findOne: jest.fn(() => Promise.resolve(null as unknown)),
  findOneBy: jest.fn(() => Promise.resolve(null as unknown)),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  createQueryBuilder: jest.fn(() => ({})),
};

const mockLoteRepo = { count: jest.fn(() => Promise.resolve(0)) };
const mockInspecaoRepo = { count: jest.fn(() => Promise.resolve(0)) };
const mockProdutoRepo = { count: jest.fn(() => Promise.resolve(0)) };

const mockappDataSource = {
  getRepository: jest.fn((entity: { name: string }) => {
    if (entity.name === 'Usuario') return mockUserRepo;
    if (entity.name === 'Lote') return mockLoteRepo;
    if (entity.name === 'Inspecao') return mockInspecaoRepo;
    if (entity.name === 'Produto') return mockProdutoRepo;
    return {};
  }),
};

const mockBcrypt = {
  hash: jest.fn(() => Promise.resolve('hashed_pass')),
  compare: jest.fn(() => Promise.resolve(true)),
};

jest.unstable_mockModule('../../config/appDataSource.js', () => ({
  appDataSource: mockappDataSource,
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt,
}));

const { UsuarioService: usuarioService } = await import('../usuario.service.js');

let service: InstanceType<typeof usuarioService>;

function criarService() {
  const usuarioDeps = {
    usuarioRepo: mockUserRepo as unknown as Repository<Usuario>,
    loteRepo: mockLoteRepo as unknown as Repository<Lote>,
    inspecaoRepo: mockInspecaoRepo as unknown as Repository<Inspecao>,
    produtoRepo: mockProdutoRepo as unknown as Repository<Produto>,
  };
  return new usuarioService(usuarioDeps);
}

describe('findById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service = criarService();
  });

  it('deve lançar erro se o usuário não for encontrado', async () => {
    (mockUserRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(null),
    );
    await expect(
      service.buscarPorId(1, { id: 1, perfil: PerfilUsuario.GESTOR }),
    ).rejects.toThrow('Usuário não encontrado');
  });

  it('deve retornar o usuário se encontrado e tiver permissão', async () => {
    const userMock = { id: 1, nome: 'Teste', email: 't@t.com', ativo: true };
    (mockUserRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(userMock),
    );

    const result = await service.buscarPorId(1, {
      id: 1,
      perfil: PerfilUsuario.GESTOR,
    });

    expect(result.nome).toBe('Teste');
  });
});

describe('create', () => {
  const dto = {
    nome: 'Novo',
    email: 'novo@t.com',
    senha: '123',
    perfil: PerfilUsuario.OPERADOR,
    ativo: true,
  };
  const req = { id: 1, perfil: PerfilUsuario.GESTOR };

  beforeEach(() => {
    jest.clearAllMocks();
    service = criarService();
  });

  it('deve lançar erro se o e-mail já estiver em uso', async () => {
    (mockUserRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 2 }),
    );

    await expect(service.criar(dto, req)).rejects.toThrow(/já está em uso/);
  });

  it('deve criar e salvar o novo usuário', async () => {
    (mockUserRepo.findOne as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(null),
    );
    (mockUserRepo.findOneBy as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ id: 1, nome: 'Admin' }),
    );
    (mockUserRepo.create as unknown as jest.Mock).mockReturnValue({ ...dto, id: 10 });
    (mockUserRepo.save as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ...dto, id: 10 }),
    );

    const result = await service.criar(dto, req);

    expect(result.id).toBe(10);
    expect(mockBcrypt.hash).toHaveBeenCalledWith('123', 12);
    expect(mockUserRepo.save).toHaveBeenCalled();
  });
});

describe('updateSenha', () => {
  const dto = { senha_atual: '123', nova_senha: '456' };
  const req = { id: 1, perfil: PerfilUsuario.OPERADOR };

  beforeEach(() => {
    jest.clearAllMocks();
    service = criarService();
  });

  it('deve lançar erro se a senha atual estiver incorreta', async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve({ id: 1, senha_hash: 'hash' })),
    };
    (mockUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );
    (mockBcrypt.compare as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(false),
    );

    await expect(service.atualizarSenha(1, dto, req)).rejects.toThrow(
      'Senha atual incorreta',
    );
  });

  it('deve atualizar a senha se a atual estiver correta', async () => {
    const userMock = { id: 1, senha_hash: 'old_hash' };
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve(userMock)),
    };
    (mockUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );
    (mockBcrypt.compare as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve(true),
    );

    await service.atualizarSenha(1, dto, req);

    expect(mockBcrypt.hash).toHaveBeenCalledWith('456', 12);
    expect(mockUserRepo.save).toHaveBeenCalled();
  });
});
