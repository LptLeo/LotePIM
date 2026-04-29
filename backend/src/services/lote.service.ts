import { ILike, type Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { ConsumoInsumo } from "../entities/ConsumoInsumo.js";
import { InsumoEstoque } from "../entities/InsumoEstoque.js";
import { Produto } from "../entities/Produto.js";
import { PerfilUsuario, Usuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import type { CriarLoteDTO } from "../dto/lote.dto.js";
import { NotificacaoService } from "./notificacao.service.js";
import { TipoNotificacao } from "../entities/Notificacao.js";
import { PaginacaoQueryDto, formatarRespostaPaginada, type RespostaPaginada } from "../dto/paginacao.dto.js";

export class LoteService {
  private loteRepo: Repository<Lote>;
  private produtoRepo: Repository<Produto>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.produtoRepo = AppDataSource.getRepository(Produto);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  /** Gera número de lote sequencial no padrão LOT-DDMMAAAA-N (N = item do dia) */
  private async gerarNumeroLote(data: Date | string): Promise<string> {
    const d = typeof data === "string" ? new Date(data) : data;
    const dia = d.getUTCDate().toString().padStart(2, "0");
    const mes = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const ano = d.getUTCFullYear();
    
    const prefixo = `LOT-${dia}${mes}${ano}-`;

    const contagem = await this.loteRepo.count({
      where: { numero_lote: ILike(`${prefixo}%`) },
    });

    const sequencial = contagem + 1;
    const numeroLote = `${prefixo}${sequencial}`;

    // Validação de segurança (Regex): LOT-8dígitos-número
    const regex = /^LOT-\d{8}-\d+$/;
    if (!regex.test(numeroLote)) {
      throw new AppError("Erro ao gerar número de lote no padrão esperado.", 500);
    }

    return numeroLote;
  }

  /**
   * Cria um lote e vincula os consumos de insumo em uma única transação.
   * Abate o estoque de cada InsumoEstoque consumido.
   */
  criar = async (dto: CriarLoteDTO, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const produto = await this.produtoRepo.findOneBy({ id: dto.produto_id });
    if (!produto) throw new AppError("Produto não encontrado.", 404);

    const operador = await this.usuarioRepo.findOneBy({ id: requisitante.id });
    if (!operador) throw new AppError("Operador não encontrado.", 404);

    const numeroLote = await this.gerarNumeroLote(dto.data_producao);
    const notificacaoService = new NotificacaoService();

    return AppDataSource.transaction(async (manager) => {
      const lote = manager.create(Lote, {
        numero_lote: numeroLote,
        produto,
        quantidade_planejada: dto.quantidade_planejada,
        status: LoteStatus.EM_PRODUCAO,
        turno: dto.turno,
        operador,
        data_producao: dto.data_producao,
        data_validade: dto.data_validade ?? null,
        observacoes: dto.observacoes || "",
      });

      const loteSalvo = await manager.save(lote);
      const gestores = await manager.find(Usuario, { where: { perfil: PerfilUsuario.GESTOR, ativo: true } });

      /** Processa cada consumo: valida estoque, abate e registra */
      for (const consumo of dto.consumos) {
        const insumo = await manager.findOne(InsumoEstoque, {
          where: { id: consumo.insumo_estoque_id },
          relations: ["materiaPrima"],
        });

        if (!insumo) {
          throw new AppError(`Lote de insumo ID ${consumo.insumo_estoque_id} não encontrado.`, 404);
        }

        if (insumo.materiaPrima.unidade_medida === "UN" && !Number.isInteger(consumo.quantidade_consumida)) {
          throw new AppError(
            `A matéria-prima '${insumo.materiaPrima.nome}' não aceita consumo de lote fracionado.`,
            400
          );
        }

        if (!insumo.ativo) {
          throw new AppError(
            `Lote ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) está inativo.`,
            400
          );
        }

        const saldoAtual = Number(insumo.quantidade_atual);
        if (saldoAtual < consumo.quantidade_consumida) {
          throw new AppError(
            `Saldo insuficiente no lote ${insumo.numero_lote_interno}. ` +
              `Disponível: ${saldoAtual}, Solicitado: ${consumo.quantidade_consumida}.`,
            400
          );
        }

        const novoSaldo = saldoAtual - consumo.quantidade_consumida;
        insumo.quantidade_atual = novoSaldo;
        await manager.save(insumo);

        /** Registra o consumo */
        const registro = manager.create(ConsumoInsumo, {
          lote: loteSalvo,
          insumoEstoque: insumo,
          quantidade_consumida: consumo.quantidade_consumida,
        });

        await manager.save(registro);

        /** Lógica de Alerta de Estoque para Gestores */
        const percentualAnterior = (saldoAtual / insumo.quantidade_inicial) * 100;
        const percentualNovo = (novoSaldo / insumo.quantidade_inicial) * 100;

        for (const gestor of gestores) {
          // Se cruzou a linha da porcentagem agora (antes estava acima, agora está abaixo ou igual)
          if (percentualAnterior > gestor.alerta_estoque_porcentagem && percentualNovo <= gestor.alerta_estoque_porcentagem) {
            await notificacaoService.criarNotificacaoParaUsuario(
              `Estoque Baixo: O insumo ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) atingiu ${percentualNovo.toFixed(1)}% do seu volume inicial.`,
              TipoNotificacao.ESTOQUE,
              gestor
            );
          }
        }
      }

      const loteCompleto = await manager.findOne(Lote, {
        where: { id: loteSalvo.id },
        relations: [
          "operador",
          "produto",
          "produto.receita",
          "produto.receita.materiaPrima",
          "consumos",
          "consumos.insumoEstoque",
          "consumos.insumoEstoque.materiaPrima",
          "inspecao",
          "inspecao.inspetor",
        ],
      });

      if (!loteCompleto) throw new AppError("Erro na transação ao criar lote.", 500);

      return loteCompleto;
    });
  };

  listar = async (query: PaginacaoQueryDto & { status?: string }, requisitante: Requisitante): Promise<RespostaPaginada<Lote>> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const { pagina, limite, busca, status } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.loteRepo.createQueryBuilder("lote")
      .leftJoinAndSelect("lote.produto", "produto")
      .leftJoinAndSelect("lote.operador", "operador")
      .leftJoinAndSelect("lote.inspecao", "inspecao")
      .leftJoinAndSelect("lote.consumos", "consumos")
      .skip(skip)
      .take(limite)
      .orderBy("lote.aberto_em", "DESC");

    if (busca) {
      queryBuilder.andWhere("(lote.numero_lote ILIKE :busca OR produto.nome ILIKE :busca)", { busca: `%${busca}%` });
    }

    if (status && status !== 'todos') {
      queryBuilder.andWhere("lote.status = :status", { status });
    }

    const [lotes, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada([lotes, total], query);
  };

  getContagemPorStatus = async (requisitante: Requisitante): Promise<Record<string, number>> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR, PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR]);

    const counts = await this.loteRepo
      .createQueryBuilder("lote")
      .select("lote.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("lote.status")
      .getRawMany<{ status: string; count: string }>();

    const result: Record<string, number> = {
      todos: 0,
      em_producao: 0,
      aguardando_inspecao: 0,
      aprovado: 0,
      aprovado_restricao: 0,
      reprovado: 0,
    };

    let total = 0;
    counts.forEach((c) => {
      const count = Number(c.count);
      result[c.status] = count;
      total += count;
    });
    result.todos = total;

    return result;
  };

  buscarPorId = async (id: number, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const lote = await this.loteRepo.findOne({
      where: { id },
      relations: [
        "operador",
        "produto",
        "produto.receita",
        "produto.receita.materiaPrima",
        "consumos",
        "consumos.insumoEstoque",
        "consumos.insumoEstoque.materiaPrima",
        "inspecao",
        "inspecao.inspetor",
      ],
    });

    if (!lote) throw new AppError("Lote não encontrado.", 404);
    return lote;
  };

  /** Endpoint para o frontend obter o tempo de produção configurado */
  getTempoProducao = (): number => {
    return Number(process.env.TEMPO_PRODUCAO_MINUTOS) || 2;
  };
}
