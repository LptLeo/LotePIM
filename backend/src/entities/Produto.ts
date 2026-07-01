import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';

import { EntidadeBase } from './base.entity.js';
import { ReceitaItem } from './ReceitaItem.js';
import { Lote } from './Lote.js';
import { Usuario } from './Usuario.js';

@Entity('produto')
export class Produto extends EntidadeBase {
  @Index()
  @Column({ type: 'text', nullable: false })
  nome!: string;

  @Index()
  @Column({ type: 'text', unique: true, nullable: false })
  sku!: string;

  @Column({ type: 'text', nullable: false })
  categoria!: string;

  @Column({ type: 'text', nullable: false })
  linha_padrao!: string;

  /** Limiar de reprovação (%) para determinar o resultado da inspeção */
  @Column({ type: 'numeric', nullable: false })
  percentual_ressalva!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por_id' })
  criadoPor!: Relation<Usuario>;

  @OneToMany(() => ReceitaItem, (receitaItem) => receitaItem.produto, { cascade: true })
  receita!: Relation<ReceitaItem>[];

  @OneToMany(() => Lote, (lote) => lote.produto)
  lotes!: Relation<Lote>[];
}
