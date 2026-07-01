import request from 'supertest';
import { app } from '../../server.js';
import {
  startTestContainer,
  stopTestContainer,
  limparBanco,
} from './integration.setup.js';
import bcrypt from 'bcrypt';
import { appDataSource } from '../../config/appDataSource.js';
import { Usuario, PerfilUsuario } from '../../entities/Usuario.js';

describe('Autenticação (Integração)', () => {
  beforeAll(async () => {
    await startTestContainer();
  }, 60000);

  afterAll(async () => {
    await stopTestContainer();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  it('deve permitir login com credenciais válidas', async () => {
    const userRepo = appDataSource.getRepository(Usuario);
    const pass = await bcrypt.hash('senha123', 10);
    await userRepo.save(
      userRepo.create({
        nome: 'User Login',
        email: 'login@teste.com',
        senha_hash: pass,
        perfil: PerfilUsuario.OPERADOR,
        ativo: true,
      }),
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@teste.com', senha: 'senha123' });

    expect(response.status).toBe(200);
    expect(response.body.tokenAcesso).toBeDefined();
    expect(response.header['set-cookie']).toBeDefined(); // tokenAtualizacao
  });

  it('deve rejeitar login com senha errada', async () => {
    const userRepo = appDataSource.getRepository(Usuario);
    const pass = await bcrypt.hash('senha123', 10);
    await userRepo.save(
      userRepo.create({
        nome: 'User Login 2',
        email: 'login2@teste.com',
        senha_hash: pass,
        perfil: PerfilUsuario.OPERADOR,
        ativo: true,
      }),
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@teste.com', senha: 'senha_incorreta_longa' });

    expect(response.status).toBe(401);
  });
});
