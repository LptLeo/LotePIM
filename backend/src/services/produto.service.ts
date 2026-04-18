import type { Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { Produto } from "../entities/Produto.js";
import { ReceitaItem } from "../entities/ReceitaItem.js";
import { MateriaPrima } from "../entities/MateriaPrima.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import type { CriarProdutoDTO, AtualizarReceitaDTO } from "../dto/produto.dto.js";

export class ProdutoService {
  private produtoRepo: Repository<Produto>;
  private receitaRepo: Repository<ReceitaItem>;
  private mpRepo: Repository<MateriaPrima>;

  constructor() {
    this.produtoRepo = AppDataSource.getRepository(Produto);
    this.receitaRepo = AppDataSource.getRepository(ReceitaItem);
    this.mpRepo = AppDataSource.getRepository(MateriaPrima);
  }

  /** Gera SKU a partir do nome (ex: "Monitor 14 LED" → "PRD-MONITOR14LED") */
  private gerarSku(nome: string): string {
    const base = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12);

    return `PRD-${base}`;
  }

  private async garantirSkuUnico(skuBase: string): Promise<string> {
    let sku = skuBase;
    let tentativa = 1;

    while (await this.produtoRepo.findOneBy({ sku })) {
      sku = `${skuBase}-${tentativa}`;
      tentativa++;
    }

    return sku;
  }

  criar = async (dto: CriarProdutoDTO, requisitante: Requisitante): Promise<Produto> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const skuBase = this.gerarSku(dto.nome);
    const skuUnico = await this.garantirSkuUnico(skuBase);

    return AppDataSource.transaction(async (manager) => {
      const produto = manager.create(Produto, {
        nome: dto.nome,
        sku: skuUnico,
        categoria: dto.categoria,
        linha_padrao: dto.linha_padrao,
        percentual_ressalva: dto.percentual_ressalva,
        ativo: dto.ativo,
      });

      const produtoSalvo = await manager.save(produto);

      /** Cria os itens da receita vinculados ao produto */
      if (dto.receita && dto.receita.length > 0) {
        const itensReceita = await Promise.all(
          dto.receita.map(async (item) => {
            const mp = await this.mpRepo.findOneBy({ id: item.materia_prima_id });
            if (!mp) {
              throw new AppError(`Matéria-prima ID ${item.materia_prima_id} não encontrada.`, 404);
            }

            return manager.create(ReceitaItem, {
              produto: produtoSalvo,
              materiaPrima: mp,
              quantidade: item.quantidade,
              unidade: item.unidade,
            });
          })
        );
        await manager.save(itensReceita);
      }

      const produtoCompleto = await manager.findOne(Produto, {
        where: { id: produtoSalvo.id },
        relations: ["receita", "receita.materiaPrima"],
      });

      if (!produtoCompleto) throw new AppError("Erro na transação ao criar produto.", 500);

      return produtoCompleto;
    });
  };

  listar = async (requisitante: Requisitante): Promise<Produto[]> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    return this.produtoRepo.find({
      relations: ["receita", "receita.materiaPrima"],
      order: { nome: "ASC" },
    });
  };

  buscarPorId = async (id: number, requisitante: Requisitante): Promise<Produto> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const produto = await this.produtoRepo.findOne({
      where: { id },
      relations: ["receita", "receita.materiaPrima"],
    });

    if (!produto) throw new AppError("Produto não encontrado.", 404);
    return produto;
  };

  /** Lista categorias distintas de produtos */
  listarCategorias = async (requisitante: Requisitante): Promise<string[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const resultados = await this.produtoRepo
      .createQueryBuilder("p")
      .select("DISTINCT p.categoria", "categoria")
      .orderBy("p.categoria", "ASC")
      .getRawMany<{ categoria: string }>();

    return resultados.map((r) => r.categoria);
  };

  atualizarReceita = async (
    produtoId: number,
    dto: AtualizarReceitaDTO,
    requisitante: Requisitante
  ): Promise<Produto> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await this.produtoRepo.findOneBy({ id: produtoId });
    if (!produto) {
      throw new AppError("Produto não encontrado.", 404);
    }

    return AppDataSource.transaction(async (manager) => {
      // Remover os itens de receita existentes
      await manager.delete(ReceitaItem, { produto: { id: produtoId } });

      // Adicionar os novos itens
      if (dto.length > 0) {
        const itensReceita = await Promise.all(
          dto.map(async (item) => {
            const mp = await this.mpRepo.findOneBy({ id: item.materia_prima_id });
            if (!mp) {
              throw new AppError(`Matéria-prima ID ${item.materia_prima_id} não encontrada.`, 404);
            }

            return manager.create(ReceitaItem, {
              produto: produto,
              materiaPrima: mp,
              quantidade: item.quantidade,
              unidade: item.unidade,
            });
          })
        );
        await manager.save(itensReceita);
      }

      const produtoAtualizado = await manager.findOne(Produto, {
        where: { id: produtoId },
        relations: ["receita", "receita.materiaPrima"],
      });

      if (!produtoAtualizado) throw new AppError("Erro ao recarregar produto atualizado.", 500);

      return produtoAtualizado;
    });
  };
}