import { AppDataSource } from "./AppDataSource.js";
import { Usuario, PerfilUsuario } from "../entities/Usuario.js";
import { MateriaPrima, UnidadeMedida } from "../entities/MateriaPrima.js";
import { Produto } from "../entities/Produto.js";
import { ReceitaItem } from "../entities/ReceitaItem.js";
import { InsumoEstoque, Turno } from "../entities/InsumoEstoque.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/**
 * Seed de demonstração completo.
 * Popula o banco com dados suficientes para testar todos os fluxos:
 * catálogo → estoque → produção → inspeção.
 *
 * Idempotente: verifica existência antes de criar qualquer registro.
 */
async function seed() {
  try {
    console.log("[seed] Conectando ao banco de dados...");
    await AppDataSource.initialize();

    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const mpRepo = AppDataSource.getRepository(MateriaPrima);
    const produtoRepo = AppDataSource.getRepository(Produto);
    const receitaRepo = AppDataSource.getRepository(ReceitaItem);
    const estoqueRepo = AppDataSource.getRepository(InsumoEstoque);

    // ─── 1. Usuários ──────────────────────────────────────────
    const emailGestor = process.env.SEED_USER_EMAIL || "gestor@lotepim.com";
    const senhaLimpa = process.env.SEED_USER_PASSWORD || "senha123";

    const gestorExiste = await usuarioRepo.findOneBy({ email: emailGestor });
    let gestor: Usuario;

    if (gestorExiste) {
      console.log(`[seed] Gestor '${emailGestor}' já existe.`);
      gestor = gestorExiste;
    } else {
      console.log(`[seed] Criando gestor: ${emailGestor}`);
      gestor = await usuarioRepo.save(
        usuarioRepo.create({
          nome: "Gestor Inicial",
          email: emailGestor,
          senha_hash: await bcrypt.hash(senhaLimpa, SALT_ROUNDS),
          perfil: PerfilUsuario.GESTOR,
          ativo: true,
        })
      );
    }

    const operadorExiste = await usuarioRepo.findOneBy({ email: "operador@lotepim.com" });
    let operador: Usuario;

    if (operadorExiste) {
      console.log("[seed] Operador já existe.");
      operador = operadorExiste;
    } else {
      console.log("[seed] Criando operador...");
      operador = await usuarioRepo.save(
        usuarioRepo.create({
          nome: "Carlos Operador",
          email: "operador@lotepim.com",
          senha_hash: await bcrypt.hash("senha123", SALT_ROUNDS),
          perfil: PerfilUsuario.OPERADOR,
          ativo: true,
        })
      );
    }

    const inspetorExiste = await usuarioRepo.findOneBy({ email: "inspetor@lotepim.com" });
    let inspetor: Usuario;

    if (inspetorExiste) {
      console.log("[seed] Inspetor já existe.");
      inspetor = inspetorExiste;
    } else {
      console.log("[seed] Criando inspetor...");
      inspetor = await usuarioRepo.save(
        usuarioRepo.create({
          nome: "Ana Inspetora",
          email: "inspetor@lotepim.com",
          senha_hash: await bcrypt.hash("senha123", SALT_ROUNDS),
          perfil: PerfilUsuario.INSPETOR,
          ativo: true,
        })
      );
    }

    // ─── 2. Matérias-Primas (Catálogo) ────────────────────────
    const materiasPrimasDados = [
      {
        nome: "Painel LED 14 polegadas",
        sku_interno: "MP-PAINELLED14",
        unidade_medida: UnidadeMedida.UN,
        categoria: "Eletrônicos",
      },
      {
        nome: "Placa Mãe ATX",
        sku_interno: "MP-PLACAMAEATX",
        unidade_medida: UnidadeMedida.UN,
        categoria: "Eletrônicos",
      },
    ];

    const materiasPrimas: MateriaPrima[] = [];

    for (const dados of materiasPrimasDados) {
      const existente = await mpRepo.findOneBy({ sku_interno: dados.sku_interno });
      if (existente) {
        console.log(`[seed] MateriaPrima '${dados.nome}' já existe.`);
        materiasPrimas.push(existente);
      } else {
        console.log(`[seed] Criando matéria-prima: ${dados.nome}`);
        const mp = await mpRepo.save(mpRepo.create(dados));
        materiasPrimas.push(mp);
      }
    }

    const painelLed = materiasPrimas[0]!;
    const placaMae = materiasPrimas[1]!;

    // ─── 3. Produto com Receita ───────────────────────────────
    const produtoExistente = await produtoRepo.findOneBy({ sku: "PRD-MONITORGAME" });
    let produto: Produto;

    if (produtoExistente) {
      console.log("[seed] Produto 'Monitor Gamer' já existe.");
      produto = produtoExistente;
    } else {
      console.log("[seed] Criando produto 'Monitor Gamer' com receita...");
      produto = await produtoRepo.save(
        produtoRepo.create({
          nome: "Monitor Gamer 144Hz",
          sku: "PRD-MONITORGAME",
          categoria: "Monitores",
          linha_padrao: "Linha A",
          percentual_ressalva: 10,
          ativo: true,
        })
      );

      /** Receita: 1x Painel LED + 1x Placa Mãe por unidade */
      const item1 = receitaRepo.create({
        produto,
        materiaPrima: painelLed,
        quantidade: 1,
        unidade: "UN",
      });
      const item2 = receitaRepo.create({
        produto,
        materiaPrima: placaMae,
        quantidade: 1,
        unidade: "UN",
      });
      await receitaRepo.save([item1, item2]);
    }

    // ─── 4. Lotes de InsumoEstoque (Estoque Físico) ───────────
    const lotesDados = [
      {
        materiaPrima: painelLed,
        numero_lote_fornecedor: "FORN-LED-2026-A001",
        numero_lote_interno: "INS-20260416-001",
        quantidade_inicial: 200,
        quantidade_atual: 200,
        fornecedor: "Samsung Display Corp.",
        codigo_interno: "SDC-14L-2026",
        turno: Turno.MANHA,
        observacoes: "Lote recebido em perfeitas condições.",
      },
      {
        materiaPrima: painelLed,
        numero_lote_fornecedor: "FORN-LED-2026-A002",
        numero_lote_interno: "INS-20260416-002",
        quantidade_inicial: 150,
        quantidade_atual: 150,
        fornecedor: "LG Electronics",
        codigo_interno: "LGE-14P-2026",
        turno: Turno.TARDE,
        observacoes: "",
      },
      {
        materiaPrima: placaMae,
        numero_lote_fornecedor: "FORN-MB-2026-B001",
        numero_lote_interno: "INS-20260416-003",
        quantidade_inicial: 100,
        quantidade_atual: 100,
        fornecedor: "ASUS Components",
        codigo_interno: "ASUS-ATX-B660",
        turno: Turno.MANHA,
        observacoes: "Certificado de qualidade anexo.",
      },
      {
        materiaPrima: placaMae,
        numero_lote_fornecedor: "FORN-MB-2026-B002",
        numero_lote_interno: "INS-20260416-004",
        quantidade_inicial: 80,
        quantidade_atual: 80,
        fornecedor: "Gigabyte Technology",
        codigo_interno: "GB-ATX-Z790",
        turno: Turno.NOITE,
        observacoes: "",
      },
    ];

    for (const dados of lotesDados) {
      const existente = await estoqueRepo.findOneBy({
        numero_lote_interno: dados.numero_lote_interno,
      });

      if (existente) {
        console.log(`[seed] InsumoEstoque '${dados.numero_lote_interno}' já existe.`);
      } else {
        console.log(`[seed] Criando estoque: ${dados.numero_lote_interno} (${dados.materiaPrima!.nome})`);
        await estoqueRepo.save(
          estoqueRepo.create({
            ...dados,
            operador,
            data_validade: null,
            ativo: true,
          })
        );
      }
    }

    console.log("\n[seed] ✅ Seed concluído com sucesso!");
    console.log("[seed] Dados criados:");
    console.log("  → 3 Usuários (gestor, operador, inspetor)");
    console.log("  → 2 Matérias-Primas (Painel LED, Placa Mãe)");
    console.log("  → 1 Produto com Receita (Monitor Gamer = 1x Painel + 1x Placa)");
    console.log("  → 4 Lotes de InsumoEstoque (2 por matéria-prima)");
    console.log("\nCredenciais de acesso:");
    console.log(`  Gestor:   ${emailGestor} / ${senhaLimpa}`);
    console.log("  Operador: operador@lotepim.com / senha123");
    console.log("  Inspetor: inspetor@lotepim.com / senha123");
  } catch (error) {
    console.error("[seed] ❌ Erro ao rodar o seed:", error);
  } finally {
    await AppDataSource.destroy();
    console.log("[seed] Conexão encerrada.");
    process.exit(0);
  }
}

seed();
