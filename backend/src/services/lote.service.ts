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

export class LoteService {
  private loteRepo: Repository<Lote>;
  private produtoRepo: Repository<Produto>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.produtoRepo = AppDataSource.getRepository(Produto);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  /** Gera número de lote sequencial (ex: LOT-20260416-001) */
  private async gerarNumeroLote(data: Date | string): Promise<string> {
    const d = typeof data === "string" ? new Date(data) : data;
    const ano = d.getUTCFullYear();
    const mes = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const dia = d.getUTCDate().toString().padStart(2, "0");

    const prefixo = `LOT-${ano}${mes}${dia}-`;

    const contagem = await this.loteRepo.count({
      where: { numero_lote: ILike(`${prefixo}%`) },
    });

    const sequencial = (contagem + 1).toString().padStart(3, "0");
    return `${prefixo}${sequencial}`;
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

        /** Abate o estoque */
        insumo.quantidade_atual = saldoAtual - consumo.quantidade_consumida;
        await manager.save(insumo);

        /** Registra o consumo */
        const registro = manager.create(ConsumoInsumo, {
          lote: loteSalvo,
          insumoEstoque: insumo,
          quantidade_consumida: consumo.quantidade_consumida,
        });

        await manager.save(registro);
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

  listar = async (requisitante: Requisitante): Promise<Lote[]> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    return this.loteRepo.find({
      relations: ["operador", "produto", "consumos", "consumos.insumoEstoque"],
      order: { aberto_em: "DESC" },
    });
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