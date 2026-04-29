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
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
    console.log(`[seed] 🚀 Iniciando geração de dados no host: ${process.env.DB_HOST || 'localhost'}`);
    await AppDataSource.initialize();

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const usuarioRepo = transactionalEntityManager.getRepository(Usuario);
      const mpRepo = transactionalEntityManager.getRepository(MateriaPrima);
      const produtoRepo = transactionalEntityManager.getRepository(Produto);
      const receitaRepo = transactionalEntityManager.getRepository(ReceitaItem);
      const estoqueRepo = transactionalEntityManager.getRepository(InsumoEstoque);
      const loteRepo = transactionalEntityManager.getRepository(Lote);
      const consumoRepo = transactionalEntityManager.getRepository(ConsumoInsumo);
      const inspecaoRepo = transactionalEntityManager.getRepository(Inspecao);

      // ─── 1. Usuários ────────────────────────────────────────────────────────
      console.log("[seed] 👥 Criando usuários...");
      const senhaHash = await bcrypt.hash("senha123", SALT_ROUNDS);

      async function upsertUsuario(nome: string, email: string, perfil: PerfilUsuario): Promise<Usuario> {
        let u = await usuarioRepo.findOneBy({ email });
        if (!u) {
          u = usuarioRepo.create({
            nome,
            email,
            senha_hash: senhaHash,
            perfil,
            alerta_estoque_porcentagem: 20
          });
          u = await usuarioRepo.save(u);
        }
        return u;
      }

      const gestor = await upsertUsuario("Admin Gestor", "gestor@lotepim.com", PerfilUsuario.GESTOR);
      const operador = await upsertUsuario("Carlos Operador", "operador@lotepim.com", PerfilUsuario.OPERADOR);
      const inspetor = await upsertUsuario("Ana Inspetora", "inspetor@lotepim.com", PerfilUsuario.INSPETOR);
      const op2 = await upsertUsuario("Marcos Operador 2", "operador2@lotepim.com", PerfilUsuario.OPERADOR);
      const ins2 = await upsertUsuario("Julia Inspetora 2", "inspetor2@lotepim.com", PerfilUsuario.INSPETOR);

      const operadores = [operador, op2];
      const inspetores = [inspetor, ins2];

      // ─── 2. Matérias-Primas ─────────────────────────────────────────────────
      console.log("[seed] 📦 Criando catálogo de matérias-primas...");
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

      const mpsToSave = [];
      for (const d of mpDados) {
        let m = await mpRepo.findOneBy({ sku_interno: d.sku_interno });
        if (!m) {
          mpsToSave.push(mpRepo.create(d));
        }
      }
      if (mpsToSave.length > 0) {
        await mpRepo.save(mpsToSave);
      }
      const mps = await mpRepo.find();

      // ─── 3. Produtos ────────────────────────────────────────────────────────
      console.log("[seed] 🛠️ Criando catálogo de produtos (Bulk)...");
      const produtosToSave: Produto[] = [];
      for (let idx = 1; idx <= 25; idx++) {
        const sku = `PRD-MODEL-${idx.toString().padStart(3, '0')}`;
        let p = await produtoRepo.findOneBy({ sku });
        if (!p) {
          produtosToSave.push(produtoRepo.create({
            nome: `Produto Modelo ${idx}`,
            sku,
            categoria: idx <= 10 ? "Linha Gamer" : (idx <= 20 ? "Linha Office" : "Acessórios"),
            linha_padrao: "Industrial",
            percentual_ressalva: rand(5, 15),
            criadoPor: gestor
          }));
        }
      }
      
      let produtosSalvos: Produto[] = [];
      if (produtosToSave.length > 0) {
        produtosSalvos = await produtoRepo.save(produtosToSave);
        
        const receitasToSave: ReceitaItem[] = [];
        for (let idx = 0; idx < produtosSalvos.length; idx++) {
          const p = produtosSalvos[idx];
          // Produtos 24 e 25 não terão receita
          if (idx < 23) {
            const numMps = rand(2, 5);
            const selecionadas = [...mps].sort(() => 0.5 - Math.random()).slice(0, numMps);
            for (const smp of selecionadas) {
              receitasToSave.push(receitaRepo.create({
                produto: p!,
                materiaPrima: smp,
                quantidade: smp.unidade_medida === UnidadeMedida.UN ? rand(1, 4) : 0.002,
                unidade: smp.unidade_medida
              }));
            }
          }
        }
        if (receitasToSave.length > 0) {
          await receitaRepo.save(receitasToSave, { chunk: 100 });
        }
      }

      // ─── 4. Insumos em Estoque ──────────────────────────────────────────────
      console.log("[seed] 🚛 Abastecendo estoque de insumos (Bulk)...");
      const estoquesToSave: InsumoEstoque[] = [];
      for (const mp of mps) {
        const totalNecessario = (SEED_TOTAL_LOTES / mps.length) * 100 * 5;
        const totalComSurplus = totalNecessario * (1 + SEED_INSUMO_SURPLUS / 100);
        const numLotesInsumo = rand(4, 8);
        
        let qtdPorLote = totalComSurplus / numLotesInsumo;
        if (mp.unidade_medida === UnidadeMedida.UN) {
          qtdPorLote = Math.floor(qtdPorLote);
        }

        for (let j = 1; j <= numLotesInsumo; j++) {
          const dataRec = randomDate(INICIO, HOJE);
          const numInt = `INS-${formatDateDDMMAAAA(dataRec)}-${mp.id}${j}`;
          
          estoquesToSave.push(estoqueRepo.create({
            materiaPrima: mp,
            numero_lote_fornecedor: `FORN-${mp.sku_interno}-${j}`,
            numero_lote_interno: numInt,
            quantidade_inicial: qtdPorLote,
            quantidade_atual: qtdPorLote,
            fornecedor: "Fornecedor Global PIM",
            turno: pick([Turno.MANHA, Turno.TARDE, Turno.NOITE]),
            operador: pick(operadores),
            recebido_em: dataRec
          }));
        }
      }
      
      // Salva estoques se a tabela estiver vazia (simplificação)
      const countEstoque = await estoqueRepo.count();
      if (countEstoque === 0) {
        await estoqueRepo.save(estoquesToSave, { chunk: 100 });
      }

      // ─── 5. Lotes de Produção ───────────────────────────────────────────────
      const countLotes = await loteRepo.count();
      if (countLotes === 0) {
        console.log(`[seed] 🏗️ Gerando ${SEED_TOTAL_LOTES} lotes de produção (Bulk)...`);
        
        const prodsComReceita = (await produtoRepo.find({ relations: ['receita', 'receita.materiaPrima'] }))
          .filter(p => p.receita && p.receita.length > 0);
  
        const todosProdutos = await produtoRepo.find();
        const todosEstoques = await estoqueRepo.find({ order: { recebido_em: 'ASC' }, relations: ['materiaPrima'] });
        
        const lotesToSave: Lote[] = [];
        const lotesData: any[] = [];
  
        for (let i = 0; i < SEED_TOTAL_LOTES; i++) {
          const dataProd = i < 3 ? HOJE : randomDate(INICIO, HOJE);
          const dataStr = formatDateDDMMAAAA(dataProd);
          const p = i < 3 ? todosProdutos[i] : pick(prodsComReceita);
          
          const num = `LOT-${dataStr}-${rand(100, 999)}${i}`;
  
          const qtdPlanj = rand(30, 200);
          const taxaReprovacaoReal = SEED_REPROV_BASE + (Math.random() * 2 * SEED_REPROV_VAR - SEED_REPROV_VAR);
          const isReprovado = (Math.random() * 100) < taxaReprovacaoReal;
          
          let status = LoteStatus.APROVADO;
          if (i < 3) {
            status = LoteStatus.EM_PRODUCAO;
          } else if (isReprovado) {
            status = Math.random() > 0.5 ? LoteStatus.REPROVADO : LoteStatus.APROVADO_RESTRICAO;
          }
  
          const l = loteRepo.create({
            numero_lote: num,
            produto: p!,
            quantidade_planejada: qtdPlanj,
            status: status,
            turno: pick(['manha', 'tarde', 'noite']),
            operador: pick(operadores),
            data_producao: dataProd,
            aberto_em: dataProd,
            encerrado_em: status === LoteStatus.EM_PRODUCAO ? null : new Date(dataProd.getTime() + 120000)
          });
          
          lotesToSave.push(l);
          lotesData.push({ lote: l, p, status, isReprovado, qtdPlanj });
        }
  
        // Salva os lotes em batch para obter os IDs
        console.log(`[seed] 💾 Inserindo ${lotesToSave.length} lotes no banco...`);
        const lotesSalvos = await loteRepo.save(lotesToSave, { chunk: 100 });
  
        const consumosToSave: ConsumoInsumo[] = [];
        const inspecoesToSave: Inspecao[] = [];
  
        console.log(`[seed] 🧮 Processando consumos e inspeções em memória...`);
        for (let i = 0; i < lotesSalvos.length; i++) {
          const loteSalvo = lotesSalvos[i];
          const data = lotesData[i];
  
          // Consumos
          if (data.p.receita) {
            for (const item of data.p.receita) {
              const estoque = todosEstoques.find(e => e.materiaPrima.id === item.materiaPrima.id && e.quantidade_atual > 0);
  
              if (estoque) {
                let qtdConsumo = item.quantidade * data.qtdPlanj;
                if (item.materiaPrima.unidade_medida === UnidadeMedida.UN) {
                  qtdConsumo = Math.floor(qtdConsumo);
                }
  
                consumosToSave.push(consumoRepo.create({
                  lote: loteSalvo!,
                  insumoEstoque: estoque,
                  quantidade_consumida: qtdConsumo
                }));
                
                estoque.quantidade_atual = Math.max(0, Number(estoque.quantidade_atual) - qtdConsumo);
              }
            }
          }
  
          // Inspeção
          if (data.status !== LoteStatus.EM_PRODUCAO) {
            const qtdRep = data.status === LoteStatus.REPROVADO 
              ? rand(Math.floor(data.qtdPlanj * 0.2), data.qtdPlanj) 
              : (data.status === LoteStatus.APROVADO_RESTRICAO ? rand(1, 10) : 0);
            
            const resultado = data.status === LoteStatus.APROVADO 
              ? ResultadoInspecao.APROVADO 
              : (data.status === LoteStatus.REPROVADO ? ResultadoInspecao.REPROVADO : ResultadoInspecao.APROVADO_RESTRICAO);
  
            inspecoesToSave.push(inspecaoRepo.create({
              lote: loteSalvo!,
              inspetor: pick(inspetores),
              quantidade_reprovada: qtdRep,
              resultado_calculado: resultado,
              descricao_desvio: data.isReprovado ? "Desvio na linha de montagem." : "",
              criado_em: new Date(loteSalvo!.encerrado_em!.getTime() + 5000)
            }));
          }
        }
  
        console.log(`[seed] 💾 Inserindo ${consumosToSave.length} consumos no banco...`);
        await consumoRepo.save(consumosToSave, { chunk: 500 });
        
        console.log(`[seed] 💾 Inserindo ${inspecoesToSave.length} inspeções no banco...`);
        await inspecaoRepo.save(inspecoesToSave, { chunk: 500 });
  
        console.log(`[seed] 💾 Atualizando saldo dos estoques...`);
        await estoqueRepo.save(todosEstoques, { chunk: 100 });
      } else {
        console.log(`[seed] ⏭️ Banco já possui Lotes. Pulando etapa de geração massiva.`);
      }

      // ─── 6. Notificações ────────────────────────────────────────────────────
      console.log("[seed] 🔔 Gerando notificações iniciais...");
      const notificacaoRepo = transactionalEntityManager.getRepository(Notificacao);
      const usuarios = [gestor, operador, inspetor];

      const notifsToSave: Notificacao[] = [];
      for (const u of usuarios) {
        notifsToSave.push(notificacaoRepo.create({
          usuario: u,
          tipo: TipoNotificacao.SISTEMA,
          mensagem: `Bem-vindo ao LotePIM, ${u.nome.split(' ')[0]}! O sistema está pronto para uso.`,
          lida: false
        }));

        if (u.perfil === PerfilUsuario.GESTOR) {
          notifsToSave.push(notificacaoRepo.create({
            usuario: u,
            tipo: TipoNotificacao.ESTOQUE,
            mensagem: "Alerta: O estoque de Painel LCD 14\" está abaixo de 20%.",
            lida: false
          }));
        }
      }
      await notificacaoRepo.save(notifsToSave);

    });

    console.log("\n[seed] ✨ Seed concluído com sucesso e persistido via Bulk Insert!");
  } catch (error) {
    console.error("\n[seed] ❌ Erro durante o seed (Transação revertida):", error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

seed();