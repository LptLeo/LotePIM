import request from 'supertest';
import { app } from '../../server.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import {
  startTestContainer,
  stopTestContainer,
  limparBanco,
  criarUsuarioTeste,
} from './integration.setup.js';

describe('Fluxo de Produção (Integração)', () => {
  let tokenOperador: string;

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
    // 1. Criar Matéria-prima (Gestor necessário)
    const { token: tokenGestor } = await criarUsuarioTeste(PerfilUsuario.GESTOR);

    const mpRes = await request(app)
      .post('/api/materias-primas')
      .set('Authorization', `Bearer ${tokenGestor}`)
      .send({ nome: 'Insumo Teste', unidade_medida: 'UN', categoria: 'Teste' });

    expect([200, 201]).toContain(mpRes.status);
    const mpId = mpRes.body.id;

    // 2. Criar Produto
    const prodRes = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${tokenGestor}`)
      .send({
        nome: 'Produto Final',
        sku: 'SKU-001',
        categoria: 'Teste',
        linha_padrao: 'Linha A',
        percentual_ressalva: 10,
        receita: [{ materia_prima_id: mpId, quantidade: 1, unidade: 'UN' }],
      });
    expect([200, 201]).toContain(prodRes.status);
    const produtoId = prodRes.body.id;

    // 3. Registrar Entrada de Estoque
    const estoqueRes = await request(app)
      .post('/api/insumos-estoque')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        materia_prima_id: mpId,
        quantidade_inicial: 100,
        fornecedor: 'Forn Teste',
        turno: 'manha',
        numero_lote_fornecedor: 'LOT-F-123',
      });
    expect([200, 201]).toContain(estoqueRes.status);
    const estoqueId = estoqueRes.body.id;

    // 4. Abrir Lote de Produção
    const loteRes = await request(app)
      .post('/api/lotes')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        produto_id: produtoId,
        quantidade_planejada: 10,
        turno: 'manha',
        data_producao: new Date().toISOString(),
        consumos: [{ insumo_estoque_id: estoqueId, quantidade_consumida: 10 }],
      });

    expect([200, 201]).toContain(loteRes.status);
    expect(loteRes.body.status).toBe('em_producao');
    expect(loteRes.body.numero_lote).toBeDefined();
  });
});
