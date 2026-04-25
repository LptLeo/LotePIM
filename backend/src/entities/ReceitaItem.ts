import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./EntidadeBase.js";
import type { Produto } from "./Produto.js";
import type { MateriaPrima } from "./MateriaPrima.js";

/**
 * Item da receita de um produto.
 * Pivô entre Produto e MateriaPrima que armazena a quantidade
 * necessária de cada matéria-prima por unidade do produto.
 */
@Entity("receita_item")
export class ReceitaItem extends EntidadeBase {
  @ManyToOne("Produto", "receita", { onDelete: "CASCADE" })
  @JoinColumn({ name: "produto_id" })
  produto!: Relation<Produto>;

  @ManyToOne("MateriaPrima")
  @JoinColumn({ name: "materia_prima_id" })
  materiaPrima!: Relation<MateriaPrima>;

  @Column({ type: "numeric", nullable: false })
  quantidade!: number;

  @Column({ type: "text", nullable: false })
  unidade!: string;
}
