import { AppDataSource } from "./AppDataSource.js";
import { Usuario, PerfilUsuario } from "../entities/Usuario.js";
import { MateriaPrima, UnidadeMedida } from "../entities/MateriaPrima.js";
import { Produto } from "../entities/Produto.js";
import { ReceitaItem } from "../entities/ReceitaItem.js";
import { InsumoEstoque, Turno } from "../entities/InsumoEstoque.js";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { ConsumoInsumo } from "../entities/ConsumoInsumo.js";
import { Inspecao, ResultadoInspecao } from "../entities/Inspecao.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna uma data dentro de [start, end] */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/** Retorna inteiro aleatório entre min e max (inclusive) */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Retorna string no formato DDMMAAAA (usando datas locais para evitar troca de dia por timezone) */
function formatDateDDMMAAAA(d: Date): string {
  const dia = d.getDate().toString().padStart(2, "0");
  const mes = (d.getMonth() + 1).toString().padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}${mes}${ano}`;
}

/** Simula 3 meses atrás até hoje */
const HOJE = new Date();
const INICIO = new Date(HOJE);
INICIO.setMonth(INICIO.getMonth() - 3);

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log("[seed] Conectando ao banco de dados...");
    await AppDataSource.initialize();

    const usuarioRepo  = AppDataSource.getRepository(Usuario);
    const mpRepo       = AppDataSource.getRepository(MateriaPrima);
    const produtoRepo  = AppDataSource.getRepository(Produto);
    const receitaRepo  = AppDataSource.getRepository(ReceitaItem);
    const estoqueRepo  = AppDataSource.getRepository(InsumoEstoque);
    const loteRepo     = AppDataSource.getRepository(Lote);
    const consumoRepo  = AppDataSource.getRepository(ConsumoInsumo);
    const inspecaoRepo = AppDataSource.getRepository(Inspecao);

    // ─── 1. Usuários ────────────────────────────────────────────────────────

    const emailGestor = process.env.SEED_USER_EMAIL   || "gestor@lotepim.com";
    const senhaLimpa  = process.env.SEED_USER_PASSWORD || "senha123";

    async function upsertUsuario(
      nome: string, email: string, senha: string, perfil: PerfilUsuario, criadoPor?: Usuario
    ): Promise<Usuario> {
      const existe = await usuarioRepo.findOneBy({ email });
      if (existe) { console.log(`[seed] Usuário '${email}' já existe.`); return existe; }
      console.log(`[seed] Criando usuário: ${email}`);
      const userData = {
        nome, email,
        senha_hash: await bcrypt.hash(senha, SALT_ROUNDS),
        perfil, ativo: true,
      } as any;

      if (criadoPor) {
        userData.criadoPor = criadoPor;
      }

      return usuarioRepo.save(usuarioRepo.create(userData as Usuario));
    }

    const gestor   = await upsertUsuario("Gestor Inicial",   emailGestor,              senhaLimpa, PerfilUsuario.GESTOR);
    const operador = await upsertUsuario("Carlos Operador",  "operador@lotepim.com",   "senha123", PerfilUsuario.OPERADOR, gestor);
    const inspetor = await upsertUsuario("Ana Inspetora",    "inspetor@lotepim.com",   "senha123", PerfilUsuario.INSPETOR, gestor);
    await upsertUsuario("Marcos Operador 2", "operador2@lotepim.com", "senha123", PerfilUsuario.OPERADOR, gestor);
    await upsertUsuario("Julia Inspetora 2","inspetor2@lotepim.com", "senha123", PerfilUsuario.INSPETOR, gestor);

    const operadores = [operador, await usuarioRepo.findOneBy({ email: "operador2@lotepim.com" }) as Usuario];
    const inspetores = [inspetor, await usuarioRepo.findOneBy({ email: "inspetor2@lotepim.com" }) as Usuario];

    // ─── 2. Matérias-Primas ─────────────────────────────────────────────────

    const mpDados = [
      { nome: "Painel LCD 14 pol",         sku_interno: "MP-LCD14",       unidade_medida: UnidadeMedida.UN, categoria: "Displays" },
      { nome: "Painel LED 27 pol",          sku_interno: "MP-LED27",       unidade_medida: UnidadeMedida.UN, categoria: "Displays" },
      { nome: "Placa Mãe ATX Z790",         sku_interno: "MP-MB-Z790",     unidade_medida: UnidadeMedida.UN, categoria: "Eletrônicos" },
      { nome: "Placa Mãe mATX B660",        sku_interno: "MP-MB-B660",     unidade_medida: UnidadeMedida.UN, categoria: "Eletrônicos" },
      { nome: "Fonte ATX 650W",             sku_interno: "MP-FONTE650W",   unidade_medida: UnidadeMedida.UN, categoria: "Alimentação" },
      { nome: "Fonte SFX 450W",             sku_interno: "MP-FONTE450W",   unidade_medida: UnidadeMedida.UN, categoria: "Alimentação" },
      { nome: "Dissipador de Calor",        sku_interno: "MP-DISSIPADOR",  unidade_medida: UnidadeMedida.UN, categoria: "Refrigeração" },
      { nome: "Pasta Térmica (gr)",         sku_interno: "MP-PASTA-TERM",  unidade_medida: UnidadeMedida.KG, categoria: "Refrigeração" },
      { nome: "Cabo HDMI 2.1",              sku_interno: "MP-CABO-HDMI",   unidade_medida: UnidadeMedida.UN, categoria: "Cabos" },
      { nome: "Cabo DisplayPort 1.4",       sku_interno: "MP-CABO-DP",     unidade_medida: UnidadeMedida.UN, categoria: "Cabos" },
      { nome: "Chassi ATX Mid-Tower",       sku_interno: "MP-CHASSI-ATX",  unidade_medida: UnidadeMedida.UN, categoria: "Estrutura" },
      { nome: "Parafusos M3 (pacote 100)",  sku_interno: "MP-PARAFUSO-M3", unidade_medida: UnidadeMedida.UN, categoria: "Fixação" },
    ];

    const mps: MateriaPrima[] = [];
    for (const d of mpDados) {
      const ex = await mpRepo.findOneBy({ sku_interno: d.sku_interno });
      if (ex) { console.log(`[seed] MP '${d.nome}' já existe.`); mps.push(ex); continue; }
      console.log(`[seed] Criando MP: ${d.nome}`);
      mps.push(await mpRepo.save(mpRepo.create(d)));
    }

    const [lcd14, led27, mbZ790, mbB660, fonte650, fonte450, dissipador, pasta, cabHdmi, cabDp, chassi, parafusos] = mps as [
      MateriaPrima, MateriaPrima, MateriaPrima, MateriaPrima,
      MateriaPrima, MateriaPrima, MateriaPrima, MateriaPrima,
      MateriaPrima, MateriaPrima, MateriaPrima, MateriaPrima,
    ];

    // ─── 3. Produtos com Receita ─────────────────────────────────────────────

    type ProdutoDef = {
      nome: string; sku: string; categoria: string;
      linha_padrao: string; percentual_ressalva: number;
      receita: { mp: MateriaPrima; qtd: number }[];
    };

    const produtosDef: ProdutoDef[] = [
      {
        nome: "Monitor Gamer 27\" 144Hz", sku: "PRD-MONGAME27", categoria: "Monitores",
        linha_padrao: "Linha Gamer", percentual_ressalva: 8,
        receita: [
          { mp: led27,       qtd: 1 },
          { mp: cabHdmi,     qtd: 1 },
          { mp: cabDp,       qtd: 1 },
          { mp: parafusos,   qtd: 2 },
        ],
      },
      {
        nome: "Monitor Office 14\" FHD", sku: "PRD-MONOFF14", categoria: "Monitores",
        linha_padrao: "Linha Office", percentual_ressalva: 10,
        receita: [
          { mp: lcd14,       qtd: 1 },
          { mp: cabHdmi,     qtd: 1 },
          { mp: parafusos,   qtd: 1 },
        ],
      },
      {
        nome: "PC Gamer Tower ATX", sku: "PRD-PCGAMER-ATX", categoria: "Computadores",
        linha_padrao: "Linha Gamer", percentual_ressalva: 5,
        receita: [
          { mp: mbZ790,      qtd: 1 },
          { mp: fonte650,    qtd: 1 },
          { mp: dissipador,  qtd: 1 },
          { mp: pasta,       qtd: 0.005 },
          { mp: chassi,      qtd: 1 },
          { mp: parafusos,   qtd: 5 },
        ],
      },
      {
        nome: "PC Compacto mATX", sku: "PRD-PC-MATX", categoria: "Computadores",
        linha_padrao: "Linha Office", percentual_ressalva: 10,
        receita: [
          { mp: mbB660,      qtd: 1 },
          { mp: fonte450,    qtd: 1 },
          { mp: dissipador,  qtd: 1 },
          { mp: pasta,       qtd: 0.003 },
          { mp: parafusos,   qtd: 4 },
        ],
      },
      {
        nome: "Kit Cabos Premium HDMI+DP", sku: "PRD-KIT-CABOS", categoria: "Acessórios",
        linha_padrao: "Linha Acessórios", percentual_ressalva: 15,
        receita: [
          { mp: cabHdmi,     qtd: 2 },
          { mp: cabDp,       qtd: 1 },
        ],
      },
    ];

    const produtos: Produto[] = [];
    for (const def of produtosDef) {
      const ex = await produtoRepo.findOneBy({ sku: def.sku });
      if (ex) { console.log(`[seed] Produto '${def.nome}' já existe.`); produtos.push(ex); continue; }
      console.log(`[seed] Criando produto: ${def.nome}`);
      const p = await produtoRepo.save(produtoRepo.create({
        nome: def.nome, sku: def.sku, categoria: def.categoria,
        linha_padrao: def.linha_padrao, percentual_ressalva: def.percentual_ressalva, ativo: true,
        criadoPor: gestor,
      }));
      const itens = def.receita.map(r => receitaRepo.create({
        produto: p, materiaPrima: r.mp, quantidade: r.qtd, unidade: r.mp.unidade_medida,
      }));
      await receitaRepo.save(itens);
      produtos.push(p);
    }

    // ─── 4. Lotes de InsumoEstoque (estoque físico — 3 meses) ───────────────

    const fornecedoresPorMp: Record<string, string[]> = {
      "MP-LCD14":       ["Samsung Display", "BOE Technology"],
      "MP-LED27":       ["LG Electronics", "AU Optronics"],
      "MP-MB-Z790":     ["ASUS Components", "MSI Industrial"],
      "MP-MB-B660":     ["Gigabyte Technology", "ASRock"],
      "MP-FONTE650W":   ["Corsair", "Seasonic"],
      "MP-FONTE450W":   ["be quiet!", "FSP Group"],
      "MP-DISSIPADOR":  ["Noctua", "Cooler Master"],
      "MP-PASTA-TERM":  ["Arctic", "Thermal Grizzly"],
      "MP-CABO-HDMI":   ["Belkin", "CableMatters"],
      "MP-CABO-DP":     ["Cable Matters", "Club 3D"],
      "MP-CHASSI-ATX":  ["Lian Li", "Fractal Design"],
      "MP-PARAFUSO-M3": ["Würth", "Bossard"],
    };

    // Lotes de insumo: ~3 por MP = ~36 lotes no total
    const insumosEstoque: InsumoEstoque[] = [];
    const seqPorDiaInsumo: Record<string, number> = {};

    for (const mp of mps) {
      const fornecedores = fornecedoresPorMp[mp.sku_interno] ?? ["Fornecedor Genérico"];
      const qtdLotes = rand(2, 4);

      for (let i = 0; i < qtdLotes; i++) {
        const dtRecebimento = randomDate(INICIO, HOJE);
        const dataStr = formatDateDDMMAAAA(dtRecebimento);
        
        // Chave única para o dia: prefixo de insumo + data
        const diaChave = `INS-${dataStr}`;
        seqPorDiaInsumo[diaChave] = (seqPorDiaInsumo[diaChave] || 0) + 1;
        const numInterno = `${diaChave}-${seqPorDiaInsumo[diaChave]}`;

        const ex = await estoqueRepo.findOneBy({ numero_lote_interno: numInterno });
        if (ex) { insumosEstoque.push(ex); continue; }

        const dtValidade = new Date(dtRecebimento);
        dtValidade.setMonth(dtValidade.getMonth() + rand(6, 24));

        const fornecedor = pick(fornecedores);
        const qtdInicial = mp.unidade_medida === UnidadeMedida.UN ? rand(50, 400) : rand(5, 50);
        const qtdAtual   = rand(Math.floor(qtdInicial * 0.1), qtdInicial);

        const sufixoForn = `FORN-${mp.sku_interno}-${dtRecebimento.getFullYear()}-${seqPorDiaInsumo[diaChave]}`;

        console.log(`[seed] Criando insumo estoque: ${numInterno} (${mp.nome})`);
        const ins = await estoqueRepo.save(estoqueRepo.create({
          materiaPrima: mp,
          numero_lote_fornecedor: sufixoForn,
          numero_lote_interno: numInterno,
          quantidade_inicial: qtdInicial,
          quantidade_atual: qtdAtual,
          fornecedor,
          codigo_interno: `${mp.sku_interno}-${mp.id}-${seqPorDiaInsumo[diaChave]}`,
          turno: pick([Turno.MANHA, Turno.TARDE, Turno.NOITE]),
          operador: pick(operadores),
          data_validade: dtValidade,
          observacoes: i === 0 ? "Certificado de qualidade anexo." : "",
          ativo: true,
        }));
        insumosEstoque.push(ins);
      }
    }

    // Indexa insumos por MP id para vincular consumos depois
    function insumosParaMp(mpId: number): InsumoEstoque[] {
      return insumosEstoque.filter(ie => ie.materiaPrima.id === mpId);
    }

    // ─── 5. Lotes de produção + ConsumoInsumo + Inspeção ────────────────────

    const turnos: ("manha"|"tarde"|"noite")[] = ["manha", "tarde", "noite"];
    const desviosTexto = [
      "Risco superficial na tampa.", "Parafuso faltante no conjunto.",
      "Pintura irregular no chassi.", "Conector HDMI com folga.",
      "Dissipador mal encaixado.", "Pasta térmica em excesso.",
      null, null, null, null, // maioria sem desvio (aprovado)
    ];

    const seqPorDiaLote: Record<string, number> = {};
    let totalLotesCriados = 0;

    for (const produto of produtos) {
      const def = produtosDef.find(d => d.sku === produto.sku)!;
      const qtdLotesProd = rand(6, 10); // 6-10 lotes por produto = ~35-50 lotes total

      for (let i = 0; i < qtdLotesProd; i++) {
        const dataProducao = randomDate(INICIO, HOJE);
        const dataStr = formatDateDDMMAAAA(dataProducao);
        
        // Controle de sequencial por dia
        seqPorDiaLote[dataStr] = (seqPorDiaLote[dataStr] || 0) + 1;
        const numLote = `LOT-${dataStr}-${seqPorDiaLote[dataStr]}`;

        const exLote = await loteRepo.findOneBy({ numero_lote: numLote });
        if (exLote) { console.log(`[seed] Lote ${numLote} já existe.`); continue; }

        totalLotesCriados++;
        const qtdPlanejada = rand(20, 150);
        const op = pick(operadores);

        // Maioria dos lotes estará finalizada (aprovado/reprovado), alguns em produção
        const diasAtras = (HOJE.getTime() - dataProducao.getTime()) / 86400000;
        let status: LoteStatus;
        let aberto_em = dataProducao;
        let encerrado_em: Date | null = null;

        if (diasAtras < 3) {
          status = LoteStatus.EM_PRODUCAO;
        } else if (diasAtras < 7) {
          status = LoteStatus.AGUARDANDO_INSPECAO;
          encerrado_em = new Date(dataProducao.getTime() + rand(1, 3) * 86400000);
        } else {
          const r = Math.random();
          if (r < 0.65)      status = LoteStatus.APROVADO;
          else if (r < 0.80) status = LoteStatus.APROVADO_RESTRICAO;
          else               status = LoteStatus.REPROVADO;
          encerrado_em = new Date(dataProducao.getTime() + rand(2, 10) * 86400000);
        }

        const dtValidade = new Date(dataProducao);
        dtValidade.setMonth(dtValidade.getMonth() + rand(12, 36));

        console.log(`[seed] Criando lote: ${numLote} (${produto.nome}) status=${status}`);
        const lote = await loteRepo.save(loteRepo.create({
          numero_lote: numLote,
          produto,
          quantidade_planejada: qtdPlanejada,
          status,
          turno: pick(turnos),
          operador: op,
          data_producao: dataProducao,
          data_validade: dtValidade,
          observacoes: Math.random() > 0.6 ? "Produção sem intercorrências." : "",
          aberto_em,
          encerrado_em,
        }));

        // ── ConsumoInsumo: um por item da receita ──
        for (const recItem of def.receita) {
          const insumosDisponiveis = insumosParaMp(recItem.mp.id);
          if (insumosDisponiveis.length === 0) continue;

          const insumoUsado = pick(insumosDisponiveis);
          const qtdConsumida = +(recItem.qtd * qtdPlanejada).toFixed(4);

          await consumoRepo.save(consumoRepo.create({
            lote,
            insumoEstoque: insumoUsado,
            quantidade_consumida: qtdConsumida,
            criado_em: dataProducao,
          } as any));
        }

        // ── Inspeção (apenas lotes que saíram de produção) ──
        if (
          status === LoteStatus.APROVADO ||
          status === LoteStatus.APROVADO_RESTRICAO ||
          status === LoteStatus.REPROVADO
        ) {
          const percRessalva = produto.percentual_ressalva;
          let qtdReprovada: number;
          let resultado: ResultadoInspecao;

          if (status === LoteStatus.APROVADO) {
            qtdReprovada = rand(0, Math.floor(qtdPlanejada * (percRessalva / 100) * 0.8));
            resultado = ResultadoInspecao.APROVADO;
          } else if (status === LoteStatus.APROVADO_RESTRICAO) {
            const limiteInf = Math.floor(qtdPlanejada * (percRessalva / 100) * 0.81);
            const limiteSup = Math.floor(qtdPlanejada * (percRessalva / 100));
            qtdReprovada = rand(limiteInf, limiteSup);
            resultado = ResultadoInspecao.APROVADO_RESTRICAO;
          } else {
            const limiteMin = Math.floor(qtdPlanejada * (percRessalva / 100)) + 1;
            qtdReprovada = rand(limiteMin, Math.floor(qtdPlanejada * 0.5));
            resultado = ResultadoInspecao.REPROVADO;
          }

          const desvio = pick(desviosTexto);
          const dtInspecao = encerrado_em
            ? new Date(encerrado_em.getTime() + rand(1, 48) * 3600000)
            : new Date(dataProducao.getTime() + rand(3, 15) * 86400000);

          await inspecaoRepo.save(inspecaoRepo.create({
            lote,
            inspetor: pick(inspetores),
            quantidade_reprovada: qtdReprovada,
            resultado_calculado: resultado,
            descricao_desvio: desvio ?? "",
            criado_em: dtInspecao,
          } as any));
        }
      }
    }

    // ─── Resumo ─────────────────────────────────────────────────────────────
    console.log("\n[seed] ✅ Seed concluído com sucesso!");
    console.log("[seed] Dados criados:");
    console.log(`  → Usuários:          5 (gestor, 2 operadores, 2 inspetores)`);
    console.log(`  → Matérias-Primas:   ${mps.length}`);
    console.log(`  → Produtos:          ${produtos.length} (cada um com receita)`);
    console.log(`  → Lotes de Insumo:   ~${insumosEstoque.length} (distribuídos em 3 meses)`);
    console.log(`  → Lotes de Produção: ~${totalLotesCriados} (com consumos e inspeções)`);
    console.log("\nCredenciais de acesso:");
    console.log(`  Gestor:      ${emailGestor} / ${senhaLimpa}`);
    console.log("  Operador:    operador@lotepim.com  / senha123");
    console.log("  Operador 2:  operador2@lotepim.com / senha123");
    console.log("  Inspetor:    inspetor@lotepim.com  / senha123");
    console.log("  Inspetor 2:  inspetor2@lotepim.com / senha123");
  } catch (error) {
    console.error("[seed] ❌ Erro ao rodar o seed:", error);
  } finally {
    await AppDataSource.destroy();
    console.log("[seed] Conexão encerrada.");
    process.exit(0);
  }
}

seed();
