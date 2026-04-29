import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./base.entity.js";
import type { ReceitaItem } from "./ReceitaItem.js";
import type { Lote } from "./Lote.js";
import type { Usuario } from "./Usuario.js";

/**
 * Define um produto acabado e suas regras de qualidade.
 * A receita (lista de matérias-primas necessárias) é gerenciada
 * via entidade pivot ReceitaItem para armazenar quantidade por item.
 */
@Entity("produto")
export class Produto extends EntidadeBase {
  @Index()
  @Column({ type: "text", nullable: false })
  nome!: string;

  @Index({ unique: true })
  @Column({ type: "text", unique: true, nullable: false })
  sku!: string;

  @Column({ type: "text", nullable: false })
  categoria!: string;

  @Column({ type: "text", nullable: false })
  linha_padrao!: string;

  /** Limiar de reprovação (%) para determinar o resultado da inspeção */
  @Column({ type: "numeric", nullable: false })
  percentual_ressalva!: number;

  @ManyToOne("Usuario")
  @JoinColumn({ name: "criado_por_id" })
  criadoPor!: Relation<Usuario>;

  @OneToMany("ReceitaItem", "produto", { cascade: true })
  receita!: Relation<ReceitaItem>[];

  @OneToMany("Lote", "produto")
  lotes!: Relation<Lote>[];
}
