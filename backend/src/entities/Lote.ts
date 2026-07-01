import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Index,
  type Relation,
} from 'typeorm';

import { EntidadeBase } from './base.entity.js';
import { Produto } from './Produto.js';
import { Usuario } from './Usuario.js';
import { ConsumoInsumo } from './ConsumoInsumo.js';
import { Inspecao } from './Inspecao.js';

export enum LoteStatus {
  EM_PRODUCAO = 'em_producao',
  AGUARDANDO_INSPECAO = 'aguardando_inspecao',
  APROVADO = 'aprovado',
  APROVADO_RESTRICAO = 'aprovado_restricao',
  REPROVADO = 'reprovado',
}

/**
 * Ordem de produção que transforma matéria-prima em produto acabado.
 * O status progride automaticamente via Job de progressão.
 */
@Entity('lote')
export class Lote extends EntidadeBase {
  @Index()
  @Column({ type: 'text', unique: true, nullable: false, default: '' })
  numero_lote!: string;

  @ManyToOne(() => Produto, (produto) => produto.lotes)
  @JoinColumn({ name: 'produto_id' })
  produto!: Relation<Produto>;

  @Column({ type: 'int', nullable: false })
  quantidade_planejada!: number;

  @Index()
  @Column({ type: 'enum', enum: LoteStatus, nullable: false })
  status!: LoteStatus;

  @Column({
    type: 'enum',
    enum: ['manha', 'tarde', 'noite'],
    nullable: false,
  })
  turno!: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.lotes)
  @JoinColumn({ name: 'operador_id' })
  operador!: Relation<Usuario>;

  @Index()
  @Column({ type: 'date', nullable: false })
  data_producao!: Date;

  @Column({ type: 'date', nullable: true })
  data_validade!: Date | null;

  @Column({ type: 'text', nullable: true })
  observacoes!: string | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  aberto_em!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  encerrado_em!: Date | null;

  @OneToMany(() => ConsumoInsumo, (consumo) => consumo.lote)
  consumos!: Relation<ConsumoInsumo>[];

  @OneToOne(() => Inspecao, (inspecao) => inspecao.lote)
  inspecao!: Relation<Inspecao>;
}
