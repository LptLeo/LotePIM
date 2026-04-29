import { AppDataSource } from "./AppDataSource.js";
import { Usuario, PerfilUsuario } from "../entities/Usuario.js";
import { MateriaPrima, UnidadeMedida } from "../entities/MateriaPrima.js";
import { Produto } from "../entities/Produto.js";
import { ReceitaItem } from "../entities/ReceitaItem.js";
import { InsumoEstoque, Turno } from "../entities/InsumoEstoque.js";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { ConsumoInsumo } from "../entities/ConsumoInsumo.js";
import { Inspecao, ResultadoInspecao } from "../entities/Inspecao.js";
import { Notificacao, TipoNotificacao } from "../entities/Notificacao.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const SALT_ROUNDS = 12;

// ─── Configurações via ENV ──────────────────────────────────────────────────
const SEED_TOTAL_LOTES = Number(process.env.SEED_TOTAL_LOTES_PRODUCAO) || 180;
const SEED_MESES = Number(process.env.SEED_MESES_HISTORICO) || 3;
const SEED_REPROV_BASE = Number(process.env.SEED_REPROVACAO_BASE) || 10;
const SEED_REPROV_VAR = Number(process.env.SEED_REPROVACAO_VARIACAO) || 10;
const SEED_INSUMO_SURPLUS = Number(process.env.SEED_INSUMO_SURPLUS_PCT) || 35;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function rand(min: number, max: number): number {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);
  return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function formatDateDDMMAAAA(d: Date): string {
  const dia = d.getDate().toString().padStart(2, "0");
  const mes = (d.getMonth() + 1).toString().padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}${mes}${ano}`;
}

const HOJE = new Date();
const INICIO = new Date(HOJE);
INICIO.setMonth(INICIO.getMonth() - SEED_MESES);

async function seed() {
  try {
    console.log("[seed] Iniciando geração massiva de dados...");
    await AppDataSource.initialize();

    const usuarioRepo  = AppDataSource.getRepository(Usuario);
    const mpRepo       = AppDataSource.getRepository(MateriaPrima);
    const produtoRepo  = AppDataSource.getRepository(Produto);
    const receitaRepo  = AppDataSource.getRepository(ReceitaItem);
    const estoqueRepo  = AppDataSource.getRepository(InsumoEstoque);
    const loteRepo     = AppDataSource.getRepository(Lote);
    const consumoRepo  = AppDataSource.getRepository(ConsumoInsumo);
    const inspecaoRepo = AppDataSource.getRepository(Inspecao);
    const notificacaoRepo = AppDataSource.getRepository(Notificacao);

    // ─── 1. Usuários ────────────────────────────────────────────────────────
    console.log("[seed] Criando usuários...");
    async function upsertUsuario(nome: string, email: string, perfil: PerfilUsuario): Promise<Usuario> {
      const existe = await usuarioRepo.findOneBy({ email });
      if (existe) return existe;
      const u = usuarioRepo.create({
        nome, email,
        senha_hash: await bcrypt.hash("senha123", SALT_ROUNDS),
        perfil, ativo: true, alerta_estoque_porcentagem: 20
      });
      return usuarioRepo.save(u);
    }

    const gestor   = await upsertUsuario("Admin Gestor", "gestor@lotepim.com", PerfilUsuario.GESTOR);
    const operador = await upsertUsuario("Carlos Operador", "operador@lotepim.com", PerfilUsuario.OPERADOR);
    const inspetor = await upsertUsuario("Ana Inspetora", "inspetor@lotepim.com", PerfilUsuario.INSPETOR);
    const op2 = await upsertUsuario("Marcos Operador 2", "operador2@lotepim.com", PerfilUsuario.OPERADOR);
    const ins2 = await upsertUsuario("Julia Inspetora 2", "inspetor2@lotepim.com", PerfilUsuario.INSPETOR);

    const operadores = [operador, op2];
    const inspetores = [inspetor, ins2];

    // ─── 2. Matérias-Primas ─────────────────────────────────────────────────
    console.log("[seed] Criando catálogo de matérias-primas...");
    const mpDados = [
      { nome: "Painel LCD 14\"", sku_interno: "MP-LCD14", unidade_medida: UnidadeMedida.UN, categoria: "Displays" },
      { nome: "Painel LED 27\"", sku_interno: "MP-LED27", unidade_medida: UnidadeMedida.UN, categoria: "Displays" },
      { nome: "Placa Mãe ATX Z790", sku_interno: "MP-MB-Z790", unidade_medida: UnidadeMedida.UN, categoria: "Eletrônicos" },
      { nome: "Placa Mãe mATX B660", sku_interno: "MP-MB-B660", unidade_medida: UnidadeMedida.UN, categoria: "Eletrônicos" },
      { nome: "Fonte ATX 650W", sku_interno: "MP-FONTE650W", unidade_medida: UnidadeMedida.UN, categoria: "Alimentação" },
      { nome: "Fonte SFX 450W", sku_interno: "MP-FONTE450W", unidade_medida: UnidadeMedida.UN, categoria: "Alimentação" },
      { nome: "Gabinete Gamer RGB", sku_interno: "MP-GAB-RGB", unidade_medida: UnidadeMedida.UN, categoria: "Estrutura" },
      { nome: "Cooler Processador", sku_interno: "MP-COOLER", unidade_medida: UnidadeMedida.UN, categoria: "Refrigeração" },
      { nome: "Pasta Térmica Pro", sku_interno: "MP-PASTA", unidade_medida: UnidadeMedida.KG, categoria: "Refrigeração" },
      { nome: "Cabo HDMI 2.1", sku_interno: "MP-HDMI", unidade_medida: UnidadeMedida.UN, categoria: "Cabos" },
      { nome: "Parafuso M3", sku_interno: "MP-PAR-M3", unidade_medida: UnidadeMedida.UN, categoria: "Fixação" },
    ];

    const mps: MateriaPrima[] = [];
    for (const d of mpDados) {
      let m = await mpRepo.findOneBy({ sku_interno: d.sku_interno });
      if (!m) m = await mpRepo.save(mpRepo.create(d));
      mps.push(m);
    }

    // ─── 3. Produtos (25 no total) ──────────────────────────────────────────
    console.log("[seed] Criando catálogo de 25 produtos...");
    const produtos: Produto[] = [];
    for (let idx = 1; idx <= 25; idx++) {
      const sku = `PRD-MODEL-${idx.toString().padStart(3, '0')}`;
      let p = await produtoRepo.findOneBy({ sku });
      if (!p) {
        p = await produtoRepo.save(produtoRepo.create({
          nome: `Produto Modelo ${idx}`,
          sku,
          categoria: idx <= 10 ? "Linha Gamer" : (idx <= 20 ? "Linha Office" : "Acessórios"),
          linha_padrao: "Industrial",
          percentual_ressalva: rand(5, 15),
          ativo: true,
          criadoPor: gestor
        }));

        // 2 produtos sem receita (índices 24 e 25)
        if (idx < 24) {
          const numMps = rand(2, 5);
          const selecionadas = [...mps].sort(() => 0.5 - Math.random()).slice(0, numMps);
          for (const smp of selecionadas) {
            await receitaRepo.save(receitaRepo.create({
              produto: p,
              materiaPrima: smp,
              quantidade: smp.unidade_medida === UnidadeMedida.UN ? rand(1, 4) : 0.002,
              unidade: smp.unidade_medida
            }));
          }
        }
      }
      produtos.push(p);
    }

    // ─── 4. Cálculo de Demanda e Lotes de Insumo ─────────────────────────────
    console.log("[seed] Planejando estoque de insumos...");
    
    for (const mp of mps) {
      const totalNecessario = (SEED_TOTAL_LOTES / mps.length) * 100 * 5; 
      const totalComSurplus = totalNecessario * (1 + SEED_INSUMO_SURPLUS / 100);
      
      const numLotesInsumo = rand(4, 8);
      const qtdPorLote = totalComSurplus / numLotesInsumo;

      for (let j = 1; j <= numLotesInsumo; j++) {
        const dataRec = randomDate(INICIO, HOJE);
        const numInt = `INS-${formatDateDDMMAAAA(dataRec)}-${mp.id}${j}`;
        
        const existe = await estoqueRepo.findOneBy({ numero_lote_interno: numInt });
        if (!existe) {
          await estoqueRepo.save(estoqueRepo.create({
            materiaPrima: mp,
            numero_lote_fornecedor: `FORN-${mp.sku_interno}-${j}`,
            numero_lote_interno: numInt,
            quantidade_inicial: qtdPorLote,
            quantidade_atual: qtdPorLote,
            fornecedor: "Fornecedor Global PIM",
            turno: pick([Turno.MANHA, Turno.TARDE, Turno.NOITE]),
            operador: pick(operadores),
            recebido_em: dataRec,
            ativo: true
          }));
        }
      }
    }

    // ─── 5. Lotes de Produção (180 no total) ────────────────────────────────
    console.log(`[seed] Gerando ${SEED_TOTAL_LOTES} lotes de produção...`);
    
    // 3 lotes obrigatórios iniciando HOJE (diferentes produtos)
    const prodsParaHoje = produtos.slice(0, 3);
    for (let k = 0; k < 3; k++) {
      const p = prodsParaHoje[k];
      const num = `LOT-${formatDateDDMMAAAA(HOJE)}-${k+1}`;
      if (!(await loteRepo.findOneBy({ numero_lote: num }))) {
        const l = loteRepo.create({
          numero_lote: num,
          produto: p,
          quantidade_planejada: rand(50, 150),
          status: LoteStatus.EM_PRODUCAO,
          turno: pick(['manha', 'tarde', 'noite']),
          operador: pick(operadores),
          data_producao: HOJE,
          aberto_em: new Date(HOJE.getTime() - rand(1000, 30000)),
        } as any);
        await loteRepo.save(l);
      }
    }

    // Restante dos lotes (distribuídos no tempo)
    const totalRestante = SEED_TOTAL_LOTES - 3;
    const prodsComReceita = (await produtoRepo.find({ relations: ['receita', 'receita.materiaPrima'] })).filter(p => p.receita.length > 0);

    for (let i = 0; i < totalRestante; i++) {
      const dataProd = randomDate(INICIO, HOJE);
      const dataStr = formatDateDDMMAAAA(dataProd);
      const p = pick(prodsComReceita);
      
      const num = `LOT-${dataStr}-${rand(100, 999)}${i}`;
      if (await loteRepo.findOneBy({ numero_lote: num })) continue;

      const qtdPlanj = rand(30, 200);
      
      const taxaReprovacaoReal = SEED_REPROV_BASE + (Math.random() * 2 * SEED_REPROV_VAR - SEED_REPROV_VAR);
      const isReprovado = (Math.random() * 100) < taxaReprovacaoReal;
      
      let status = LoteStatus.APROVADO;
      if (isReprovado) {
        status = Math.random() > 0.5 ? LoteStatus.REPROVADO : LoteStatus.APROVADO_RESTRICAO;
      }

      const l = loteRepo.create({
        numero_lote: num,
        produto: p,
        quantidade_planejada: qtdPlanj,
        status: status,
        turno: pick(['manha', 'tarde', 'noite']),
        operador: pick(operadores),
        data_producao: dataProd,
        aberto_em: dataProd,
        encerrado_em: new Date(dataProd.getTime() + 120000)
      } as any);
      const loteSalvo = await loteRepo.save(l);

      // Criar Consumos Reais (abate do estoque)
      for (const item of p.receita) {
        const estoque = await estoqueRepo.findOne({
          where: { materiaPrima: { id: item.materiaPrima.id }, ativo: true },
          order: { recebido_em: 'ASC' }
        });

        if (estoque) {
          const qtdConsumo = item.quantidade * qtdPlanj;
          await consumoRepo.save(consumoRepo.create({
            lote: loteSalvo as any,
            insumoEstoque: estoque,
            quantidade_consumida: qtdConsumo
          } as any));
          estoque.quantidade_atual = Math.max(0, Number(estoque.quantidade_atual) - qtdConsumo);
          await estoqueRepo.save(estoque);
        }
      }

      // Criar Inspeção para lotes finalizados
      const qtdRep = status === LoteStatus.REPROVADO 
        ? rand(Math.floor(qtdPlanj * 0.2), qtdPlanj) 
        : (status === LoteStatus.APROVADO_RESTRICAO ? rand(1, 10) : 0);
      const insp = inspecaoRepo.create({
        lote: loteSalvo as any,
        inspetor: pick(inspetores),
        quantidade_reprovada: qtdRep,
        resultado_calculado: status === LoteStatus.APROVADO ? ResultadoInspecao.APROVADO : (status === LoteStatus.REPROVADO ? ResultadoInspecao.REPROVADO : ResultadoInspecao.APROVADO_RESTRICAO),
        descricao_desvio: isReprovado ? "Desvio identificado na linha de montagem durante o seed." : "",
        criado_em: new Date((loteSalvo as any).encerrado_em!.getTime() + 5000)
      } as any);
      await inspecaoRepo.save(insp);
    }

    console.log("\n[seed] ✅ Seed concluído com sucesso!");
    console.log(`  → Produtos: ${produtos.length} (2 sem receita)`);
    console.log(`  → Lotes: ${SEED_TOTAL_LOTES} gerados (${SEED_REPROV_BASE}% base de reprovação)`);
    console.log(`  → Insumos: Gerados com ${SEED_INSUMO_SURPLUS}% de sobra.`);

  } catch (error) {
    console.error("[seed] ❌ Erro ao rodar o seed:", error);
  } finally {
    await AppDataSource.destroy();
    process.exit(0);
  }
}

seed();
