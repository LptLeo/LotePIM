import { AppDataSource } from "../config/AppDataSource.js";
import { type Repository, Like } from "typeorm";
import { Produto } from "../entities/Produto.js";
import type { CriarProdutoDTO, AtualizarProdutoDTO } from "../dto/produto.dto.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import { AppError } from "../errors/AppError.js";

export class ProdutoService {
  private produtoRepo: Repository<Produto>;

  constructor() {
    this.produtoRepo = AppDataSource.getRepository(Produto);
  }

  // createProduto
  createProduto = async (produtoDTO: CriarProdutoDTO, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
    if (existeCodigo) throw new AppError("Já existe um produto com este código.", 409);

    const novoProduto = this.produtoRepo.create({
      ...produtoDTO,
      ativo: produtoDTO.ativo ?? true,
      descricao: produtoDTO.descricao || "",
      versao: produtoDTO.versao,
      insumos_padrao: produtoDTO.insumos_padrao?.map(id => ({ id })) || []
    });

    return await this.produtoRepo.save(novoProduto);
  }

  // getAllProdutos
  getAllProdutos = async (requisitante: Requisitante, filtros?: { search?: string, ativo?: boolean, sem_insumos?: boolean, sort?: string }) => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const qb = this.produtoRepo.createQueryBuilder("produto")
      .leftJoin("produto.insumos_padrao", "insumos")
      .loadRelationCountAndMap("produto.insumosCount", "produto.insumos_padrao")
      .loadRelationCountAndMap("produto.lotesCount", "produto.lotes");

    // Condição de Ativo
    if (filtros?.ativo !== undefined) {
      // Usamos where/andWhere implicitamente via builder
      qb.andWhere("produto.ativo = :ativo", { ativo: filtros.ativo });
    }

    // Condição de Busca
    if (filtros?.search) {
      qb.andWhere(
        "(produto.nome ILIKE :search OR produto.codigo ILIKE :search)", 
        { search: `%${filtros.search}%` }
      );
    }

    // Condição de Insumos Pendentes
    if (filtros?.sem_insumos) {
      qb.andWhere("insumos.id IS NULL");
    }

    if (filtros?.sort === 'mais_produzidos') {
      // Filtra apenas produtos com lotes abertos neste mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      qb.innerJoin("produto.lotes", "lotes_rank", "lotes_rank.aberto_em >= :inicioMes", { inicioMes });
      qb.groupBy("produto.id");
      qb.addSelect("COUNT(lotes_rank.id)", "lotes_count_ranking");
      qb.orderBy("lotes_count_ranking", "DESC");
    }

    return await qb.getMany();
  }

  // getProdutoById 
  getProdutoById = async (id: number, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const produto = await this.produtoRepo.findOne({ 
      where: { id },
      relations: ["insumos_padrao"]
    });

    if (!produto) throw new AppError("Produto não encontrado.", 404);

    return produto;
  }

  // updateProduto
  updateProduto = async (id: number, produtoDTO: AtualizarProdutoDTO, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await this.getProdutoById(id, requisitante);

    if (produtoDTO.codigo && produtoDTO.codigo !== produto.codigo) {
      const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
      if (existeCodigo) throw new AppError("Já existe um produto com este código.", 409);
    }

    if (produtoDTO.insumos_padrao !== undefined) {
      // Associa a nova lista de IDs atualizando a tabela pivot
      (produto as any).insumos_padrao = produtoDTO.insumos_padrao.map(id => ({ id }));
    }

    // Assign properties manually to avoid overwriting relational fields improperly with object.assign
    if (produtoDTO.nome !== undefined) produto.nome = produtoDTO.nome;
    if (produtoDTO.codigo !== undefined) produto.codigo = produtoDTO.codigo;
    if (produtoDTO.descricao !== undefined) produto.descricao = produtoDTO.descricao;
    if (produtoDTO.linha !== undefined) produto.linha = produtoDTO.linha;
    if (produtoDTO.versao !== undefined) produto.versao = produtoDTO.versao;
    if (produtoDTO.ativo !== undefined) produto.ativo = produtoDTO.ativo;

    return await this.produtoRepo.save(produto);
  }

  // desativarProduto
  desativarProduto = async (id: number, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await this.getProdutoById(id, requisitante);

    produto.ativo = false;

    return await this.produtoRepo.save(produto);
  }

  // getCategorias
  getCategoriasAtivas = async (requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    // Resgata os nomes únicos de subfamília (linha) usando distinct
    const result = await this.produtoRepo.createQueryBuilder("produto")
      .select("produto.linha", "linha")
      .distinct(true)
      .getRawMany();
    
    return result.map(r => r.linha).filter(Boolean);
  }

  // getMetrics
  getMetrics = async (requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const total = await this.produtoRepo.count();
    const ativos = await this.produtoRepo.countBy({ ativo: true });
    const inativos = await this.produtoRepo.countBy({ ativo: false });
    
    // Contagem de quem não tem insumos (Left Join identico ao filtro)
    const semInsumos = await this.produtoRepo.createQueryBuilder("produto")
        .leftJoin("produto.insumos_padrao", "insumos")
        .where("insumos.id IS NULL")
        .getCount();

    // Contagem de quem tem lotes produzidos no mês (Inner Join idêntico ao filtro Mais Produzidos)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const resMaisProduzidos = await this.produtoRepo.createQueryBuilder("produto")
        .innerJoin("produto.lotes", "lotes")
        .where("lotes.aberto_em >= :inicioMes", { inicioMes })
        .select("COUNT(DISTINCT produto.id)", "count")
        .getRawOne();
    
    const maisProduzidosCount = Number(resMaisProduzidos?.count || 0);

    // Busca o produto com mais lotes associados NESTE MÊS
    const dbRaw = await this.produtoRepo.createQueryBuilder("produto")
      .leftJoin("produto.lotes", "lotes")
      .select("produto.nome", "nome")
      .addSelect("COUNT(lotes.id)", "lotes_count")
      .where("lotes.aberto_em >= :inicioMes", { inicioMes })
      .groupBy("produto.id")
      .orderBy("lotes_count", "DESC")
      .limit(1)
      .getRawOne();

    const maisProduzido = dbRaw && dbRaw.lotes_count > 0 ? dbRaw.nome : 'N/D';

    return { 
      total, 
      ativos, 
      inativos, 
      sem_insumos: semInsumos,
      mais_produzidos: maisProduzidosCount,
      mais_produzido: maisProduzido 
    };
  }

  // sugerirSku
  sugerirSku = async (nome: string, baseRequisitante: Requisitante) => {
    verificaPermissao(baseRequisitante, [PerfilUsuario.GESTOR]);
    if (!nome || nome.trim().length === 0) {
      throw new AppError("É necessário o nome do produto para gerar um SKU", 400);
    }
    
    const prefix = nome.trim().substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'PRD';
    let sku = '';
    let isUnique = false;
    let iterations = 0;

    while (!isUnique && iterations < 10) {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      sku = `${prefix}-${code}`;
      const existe = await this.produtoRepo.findOneBy({ codigo: sku });
      if (!existe) {
        isUnique = true;
      }
      iterations++;
    }

    if (!isUnique) {
       throw new AppError("Não foi possível gerar um SKU único automaticamente. Tente preencher manualmente.", 500);
    }

    return { sku };
  }
}