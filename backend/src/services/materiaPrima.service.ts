import { type Repository } from 'typeorm';
import { MateriaPrima } from '../entities/MateriaPrima.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import type { CriarMateriaPrimaDTO } from '../dto/materiaPrima.dto.js';
import {
  type PaginacaoQueryDto,
  formatarRespostaPaginada,
  type RespostaPaginada,
} from '../dto/paginacao.dto.js';
import { gerarSku, garantirSkuUnico } from '../utils/sku.utils.js';
import { findOneByOrFail, listarColunasDistintas } from '../utils/orm.utils.js';

export class MateriaPrimaService {
  constructor(private readonly mpRepo: Repository<MateriaPrima>) {}

  public async criar(
    dto: CriarMateriaPrimaDTO,
    requisitante: Requisitante,
  ): Promise<MateriaPrima> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const skuUnico = await garantirSkuUnico(
      this.mpRepo,
      'sku_interno',
      gerarSku(dto.nome, 'MP'),
    );

    const entidade = this.mpRepo.create({
      nome: dto.nome,
      sku_interno: skuUnico,
      unidade_medida: dto.unidade_medida as MateriaPrima['unidade_medida'],
      categoria: dto.categoria,
    });

    return this.mpRepo.save(entidade);
  }

  public async listar(
    query: PaginacaoQueryDto,
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<MateriaPrima>> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const { pagina, limite, busca } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.mpRepo
      .createQueryBuilder('mp')
      .skip(skip)
      .take(limite)
      .orderBy('mp.nome', 'ASC');

    if (busca) {
      queryBuilder.andWhere('(mp.nome ILIKE :busca OR mp.sku_interno ILIKE :busca)', {
        busca: `%${busca}%`,
      });
    }

    const [itens, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada([itens, total], query);
  }

  public async buscarPorId(
    id: number,
    requisitante: Requisitante,
  ): Promise<MateriaPrima> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    return findOneByOrFail(this.mpRepo, { id }, 'Matéria-prima');
  }

  public async listarCategorias(requisitante: Requisitante): Promise<string[]> {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    return listarColunasDistintas<string>(this.mpRepo, 'mp', 'categoria');
  }
}
