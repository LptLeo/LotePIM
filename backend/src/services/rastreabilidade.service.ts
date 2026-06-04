import { ILike, type Repository } from 'typeorm';
import type { Lote } from '../entities/Lote.js';
import type { InsumoEstoque } from '../entities/InsumoEstoque.js';
import type { ConsumoInsumo } from '../entities/ConsumoInsumo.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import { findOneOrFail } from '../utils/orm.utils.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import {
  type PaginacaoQueryDto,
  formatarRespostaPaginada,
} from '../dto/paginacao.dto.js';

export class RastreabilidadeService {
  constructor(
    private readonly loteRepo: Repository<Lote>,
    private readonly consumoRepo: Repository<ConsumoInsumo>,
    private readonly insumoRepo: Repository<InsumoEstoque>,
  ) {}

  // === MÉTODOS PÚBLICOS ===

  public async autocomplete(q: string, requisitante: Requisitante) {
    verificaPermissao(requisitante, [
      PerfilUsuario.GESTOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.OPERADOR,
    ]);

    const termo = `%${q}%`;

    const [lotes, insumos] = await Promise.all([
      this.loteRepo
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.produto', 'p')
        .where('l.numero_lote ILIKE :termo', { termo })
        .limit(6)
        .getMany(),
      this.insumoRepo
        .createQueryBuilder('ie')
        .leftJoinAndSelect('ie.materiaPrima', 'mp')
        .where('ie.numero_lote_interno ILIKE :termo', { termo })
        .orWhere('ie.numero_lote_fornecedor ILIKE :termo', { termo })
        .limit(6)
        .getMany(),
    ]);

    insumos.sort((a, b) => {
      const aUsed = a.quantidade_atual < a.quantidade_inicial ? 1 : 0;
      const bUsed = b.quantidade_atual < b.quantidade_inicial ? 1 : 0;
      if (bUsed !== aUsed) return bUsed - aUsed;
      return b.recebido_em.getTime() - a.recebido_em.getTime();
    });

    return [
      ...lotes.map((l) => ({
        id: l.id,
        texto_exibicao: l.numero_lote,
        subtexto: l.produto?.nome ?? '—',
        tipo: 'LOTE_PRODUTO' as const,
        status: l.status,
      })),
      ...insumos.map((ie) => ({
        id: ie.id,
        texto_exibicao: ie.numero_lote_interno,
        subtexto: `${ie.materiaPrima?.nome ?? '—'} · Forn: ${ie.numero_lote_fornecedor}`,
        tipo: 'LOTE_INSUMO' as const,
        status: null,
      })),
    ];
  }

  public async consultar(
    termo: string,
    q: PaginacaoQueryDto,
    requisitante: Requisitante,
  ) {
    verificaPermissao(requisitante, [
      PerfilUsuario.GESTOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.OPERADOR,
    ]);

    const ehLoteProduto = termo.toUpperCase().startsWith('LOT-');

    if (ehLoteProduto) {
      return {
        tipo: 'lote' as const,
        resultado: await this.consultarPorLote(`%${termo}%`),
      };
    }

    return {
      tipo: 'insumo' as const,
      resultado: await this.consultarPorInsumo(termo, q),
    };
  }

  // === MÉTODOS PRIVADOS ===

  private async consultarPorLote(termo: string) {
    const lote = await this.loteRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.produto', 'produto')
      .leftJoinAndSelect('l.operador', 'operador')
      .leftJoinAndSelect('l.consumos', 'consumos')
      .leftJoinAndSelect('consumos.insumoEstoque', 'insumoEstoque')
      .leftJoinAndSelect('insumoEstoque.materiaPrima', 'materiaPrima')
      .leftJoinAndSelect('insumoEstoque.operador', 'operadorInsumo')
      .leftJoinAndSelect('l.inspecao', 'inspecao')
      .leftJoinAndSelect('inspecao.inspetor', 'inspetor')
      .where('l.numero_lote ILIKE :termo', { termo })
      .getOne();

    if (!lote) throw new AppError(`Nenhum lote encontrado com o número '${termo}'.`, 404);
    return lote;
  }

  private async consultarPorInsumo(termo: string, query: PaginacaoQueryDto) {
    const { pagina, limite } = query;
    const skip = (pagina - 1) * limite;

    await this.validarExistenciaInsumo(termo);
    const { idsAfetados, total } = await this.buscarIdsLotesAfetados(termo, skip, limite);

    if (total === 0) {
      return formatarRespostaPaginada([[], 0], query);
    }

    const consumos = await this.buscarDadosLotesAfetados(idsAfetados);
    const items = this.montarResultadoRecall(consumos);

    return formatarRespostaPaginada([items, total], query);
  }

  private async validarExistenciaInsumo(termo: string) {
    const termoBusca = `%${termo}%`;

    await findOneOrFail(
      this.insumoRepo,
      {
        where: [
          { numero_lote_interno: ILike(termoBusca) },
          { numero_lote_fornecedor: ILike(termoBusca) },
        ],
        relations: ['materiaPrima'],
      },
      `Insumo '${termo}'`,
      404,
    );
  }

  private async buscarIdsLotesAfetados(termo: string, skip: number, limite: number) {
    const termoBusca = `%${termo}%`;

    const resultados = await this.consumoRepo
      .createQueryBuilder('ci')
      .innerJoin('ci.insumoEstoque', 'ie')
      .where(
        'ie.numero_lote_interno ILIKE :termo OR ie.numero_lote_fornecedor ILIKE :termo',
        {
          termo: termoBusca,
        },
      )
      .select('ci.lote_id', 'lote_id')
      .getRawMany<{ lote_id: number }>();

    const idsUnicos = [...new Set(resultados.map((r) => r.lote_id))];
    const total = idsUnicos.length;
    const idsAfetados = idsUnicos.slice(skip, skip + limite);

    return { idsAfetados, total };
  }

  private async buscarDadosLotesAfetados(idsAfetados: number[]) {
    return this.consumoRepo
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.insumoEstoque', 'ie')
      .leftJoinAndSelect('ie.materiaPrima', 'mp')
      .leftJoinAndSelect('ci.lote', 'lote')
      .leftJoinAndSelect('lote.produto', 'produto')
      .leftJoinAndSelect('lote.operador', 'operador')
      .where('lote.id IN (:...idsAfetados)', { idsAfetados })
      .orderBy('lote.data_producao', 'DESC')
      .getMany();
  }

  private montarResultadoRecall(consumos: ConsumoInsumo[]) {
    const lotesMap = new Map<
      number,
      {
        numero_lote: string;
        produto: string;
        data_producao: Date;
        status: string;
        operador_nome: string;
        insumos_correspondentes: {
          nome: string;
          lote_interno: string;
          quantidade: number;
          unidade: string;
        }[];
      }
    >();

    for (const consumo of consumos) {
      const lote = consumo.lote;
      const entry = lotesMap.get(lote.id);
      const insumoInfo = {
        nome: consumo.insumoEstoque.materiaPrima.nome,
        lote_interno: consumo.insumoEstoque.numero_lote_interno,
        quantidade: Number(consumo.quantidade_consumida),
        unidade: consumo.insumoEstoque.materiaPrima.unidade_medida,
      };

      if (entry) {
        entry.insumos_correspondentes.push(insumoInfo);
      } else {
        lotesMap.set(lote.id, {
          numero_lote: lote.numero_lote,
          produto: lote.produto.nome,
          data_producao: lote.data_producao,
          status: lote.status,
          operador_nome: lote.operador?.nome ?? '—',
          insumos_correspondentes: [insumoInfo],
        });
      }
    }

    return Array.from(lotesMap.values());
  }
}
