import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

import type { Produto } from "./Produto.js";
import type { MateriaPrima } from "./MateriaPrima.js";

/**
 * Item da receita de um produto.
 * Pivô entre Produto e MateriaPrima que armazena a quantidade
 * necessária de cada matéria-prima por unidade do produto.
 */
@Entity("receita_item")
export class ReceitaItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Produto", "receita", { onDelete: "CASCADE" })
  @JoinColumn({ name: "produto_id" })
  produto!: Relation<Produto>;

  @ManyToOne("MateriaPrima", { eager: true })
  @JoinColumn({ name: "materia_prima_id" })
  materiaPrima!: Relation<MateriaPrima>;

  @Column({ type: "numeric", nullable: false })
  quantidade!: number;

  @Column({ type: "text", nullable: false })
  unidade!: string;
}
