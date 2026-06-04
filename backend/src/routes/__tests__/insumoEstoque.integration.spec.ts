import request from 'supertest';
import { app } from '../../server.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import {
  startTestContainer,
  stopTestContainer,
  limparBanco,
  criarUsuarioTeste,
} from './integration.setup.js';

describe('Insumo Estoque (Integração)', () => {
  beforeAll(async () => {
    await startTestContainer();
  }, 60000);

  afterAll(async () => {
    await stopTestContainer();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  it('deve criar múltiplos insumos de uma vez (Bulk)', async () => {
    const { token: tokenOperador } = await criarUsuarioTeste(PerfilUsuario.OPERADOR);
    const { token: tokenGestor } = await criarUsuarioTeste(PerfilUsuario.GESTOR);

    // 1. Criar Matéria-prima
    const mpRes = await request(app)
      .post('/api/materias-primas')
      .set('Authorization', `Bearer ${tokenGestor}`)
      .send({ nome: 'Bulk MP', unidade_medida: 'KG', categoria: 'Teste' });

    expect(mpRes.status).toBe(201);
    const mpId = mpRes.body.id;

    // 2. Criar Bulk
    const response = await request(app)
      .post('/api/insumos-estoque/bulk')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        itens: [
          {
            materia_prima_id: mpId,
            quantidade_inicial: 10,
            fornecedor: 'F1',
            turno: 'manha',
          },
          {
            materia_prima_id: mpId,
            quantidade_inicial: 20,
            fornecedor: 'F1',
            turno: 'manha',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].numero_lote_interno).toMatch(/-1$/);
    expect(response.body[1].numero_lote_interno).toMatch(/-2$/);
  });
});
