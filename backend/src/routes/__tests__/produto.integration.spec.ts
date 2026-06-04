import request from 'supertest';
import { app } from '../../server.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import {
  startTestContainer,
  stopTestContainer,
  limparBanco,
  criarUsuarioTeste,
} from './integration.setup.js';
import { appDataSource } from '../../config/appDataSource.js';
import { Produto } from '../../entities/Produto.js';

describe('Produtos (Integração)', () => {
  let tokenGestor: string;

  beforeAll(async () => {
    await startTestContainer();
  }, 60000);

  afterAll(async () => {
    await stopTestContainer();
  });

  beforeEach(async () => {
    await limparBanco();
    const gestor = await criarUsuarioTeste(PerfilUsuario.GESTOR);
    tokenGestor = gestor.token;
  });

  describe('POST /api/produtos', () => {
    it('deve retornar 401 se nenhum token for enviado', async () => {
      const response = await request(app)
        .post('/api/produtos')
        .send({ nome: 'Produto Sem Auth' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Token ausente/);
    });

    it('deve retornar 400 se faltarem campos obrigatorios', async () => {
      const response = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ nome: 'Produto Incompleto' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Dados inválidos');
    });

    it('deve criar um produto com sucesso e persistir no banco real do container', async () => {
      const payload = {
        nome: 'Notebook Industrial X1',
        categoria: 'Computadores',
        linha_padrao: 'Linha A',
        percentual_ressalva: 15,
        ativo: true,
        receita: [],
      };

      const response = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send(payload);

      expect([200, 201]).toContain(response.status);
      expect(response.body.nome).toBe(payload.nome);

      // Verificação de persistência real no banco do Docker
      const produtoRepo = appDataSource.getRepository(Produto);
      const produtoNoBanco = await produtoRepo.findOneBy({ nome: payload.nome });

      expect(produtoNoBanco).toBeDefined();
      expect(produtoNoBanco?.categoria).toBe(payload.categoria);
    });
  });

  describe('GET /api/produtos', () => {
    it('deve listar os produtos cadastrados', async () => {
      const response = await request(app)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.itens)).toBe(true);
    });
  });
});
