import { ILike, type Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { MateriaPrima } from "../entities/MateriaPrima.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import type { CriarMateriaPrimaDTO } from "../dto/materiaPrima.dto.js";
import { PaginacaoQueryDto, formatarRespostaPaginada, type RespostaPaginada } from "../dto/paginacao.dto.js";

export class MateriaPrimaService {
  private repo: Repository<MateriaPrima>;

  constructor() {
    this.repo = AppDataSource.getRepository(MateriaPrima);
  }

  /** Gera um SKU interno a partir do nome (ex: "Painel LED 14" → "MP-PAINELLED14") */
  private gerarSku(nome: string): string {
    const base = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12);

    return `MP-${base}`;
  }

  /** Garante unicidade do SKU adicionando sufixo numérico se necessário */
  private async garantirSkuUnico(skuBase: string): Promise<string> {
    let sku = skuBase;
    let tentativa = 1;

    while (await this.repo.findOneBy({ sku_interno: sku })) {
      sku = `${skuBase}-${tentativa}`;
      tentativa++;
    }

    return sku;
  }

  criar = async (dto: CriarMateriaPrimaDTO, requisitante: Requisitante): Promise<MateriaPrima> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const skuBase = this.gerarSku(dto.nome);
    const skuUnico = await this.garantirSkuUnico(skuBase);

    const entidade = this.repo.create({
      nome: dto.nome,
      sku_interno: skuUnico,
      unidade_medida: dto.unidade_medida as MateriaPrima["unidade_medida"],
      categoria: dto.categoria,
    });

    return this.repo.save(entidade);
  };

  listar = async (query: PaginacaoQueryDto, requisitante: Requisitante): Promise<RespostaPaginada<MateriaPrima>> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);
    
    const { pagina, limite, busca } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.repo.createQueryBuilder("mp")
      .skip(skip)
      .take(limite)
      .orderBy("mp.nome", "ASC");

    if (busca) {
      queryBuilder.andWhere("(mp.nome ILIKE :busca OR mp.sku_interno ILIKE :busca)", { busca: `%${busca}%` });
    }

    const [itens, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada([itens, total], query);
  };

  buscarPorId = async (id: number, requisitante: Requisitante): Promise<MateriaPrima> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const mp = await this.repo.findOneBy({ id });
    if (!mp) throw new AppError("Matéria-prima não encontrada.", 404);

    return mp;
  };

  /** Lista categorias distintas para popular o dropdown no frontend */
  listarCategorias = async (requisitante: Requisitante): Promise<string[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const resultados = await this.repo
      .createQueryBuilder("mp")
      .select("DISTINCT mp.categoria", "categoria")
      .orderBy("mp.categoria", "ASC")
      .getRawMany<{ categoria: string }>();

    return resultados.map((r) => r.categoria);
  };
}
