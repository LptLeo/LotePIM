import request from 'supertest';
import { app } from '../../server.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import {
  startTestContainer,
  stopTestContainer,
  limparBanco,
  criarUsuarioTeste,
} from './integration.setup.js';

let tokenOperador: string;

async function criarMP(token: string) {
  return await request(app)
    .post('/api/materias-primas')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: 'Insumo Teste', unidade_medida: 'UN', categoria: 'Teste' });
}

async function criarProduto(token: string, mpId: number) {
  return await request(app)
    .post('/api/produtos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nome: 'Produto Final',
      sku: 'SKU-001',
      categoria: 'Teste',
      linha_padrao: 'Linha A',
      percentual_ressalva: 10,
      receita: [{ materia_prima_id: mpId, quantidade: 1, unidade: 'UN' }],
    });
}

async function criarEstoque(token: string, mpId: number) {
  return await request(app)
    .post('/api/insumos-estoque')
    .set('Authorization', `Bearer ${token}`)
    .send({
      materiaPrimaId: mpId,
      quantidade_inicial: 100,
      fornecedor: 'Forn Teste',
      turno: 'manha',
      numero_lote_fornecedor: 'LOT-F-123',
    });
}

async function criarLote(token: string, produtoId: number, estoqueId: number) {
  return await request(app)
    .post('/api/lotes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      produto_id: produtoId,
      quantidade_planejada: 10,
      turno: 'manha',
      data_producao: new Date().toISOString(),
      consumos: [{ insumo_estoque_id: estoqueId, quantidade_consumida: 10 }],
    });
}

describe('Fluxo de Produção (Integração)', () => {
  beforeAll(async () => {
    await startTestContainer();
  }, 60000);

  afterAll(async () => {
    await stopTestContainer();
  });

  beforeEach(async () => {
    await limparBanco();
    const op = await criarUsuarioTeste(PerfilUsuario.OPERADOR);
    tokenOperador = op.token;
  });

  it('deve realizar o fluxo completo: criar produto -> registrar entrada -> abrir lote', async () => {
    const { token: tokenGestor } = await criarUsuarioTeste(PerfilUsuario.GESTOR);

    const mpRes = await criarMP(tokenGestor);
    expect([200, 201]).toContain(mpRes.status);

    const prodRes = await criarProduto(tokenGestor, mpRes.body.id);
    expect([200, 201]).toContain(prodRes.status);

    const estoqueRes = await criarEstoque(tokenOperador, mpRes.body.id);
    expect([200, 201]).toContain(estoqueRes.status);
    const estoqueId = estoqueRes.body.id;

    const loteRes = await criarLote(tokenOperador, prodRes.body.id, estoqueId);
    expect([200, 201]).toContain(loteRes.status);
    expect(loteRes.body.status).toBe('em_producao');
    expect(loteRes.body.numero_lote).toBeDefined();
  });
});
