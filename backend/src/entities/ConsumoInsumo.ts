import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./EntidadeBase.js";
import type { Lote } from "./Lote.js";
import type { InsumoEstoque } from "./InsumoEstoque.js";

/**
 * Registro de consumo de um lote de insumo em uma ordem de produção.
 * Serve como pivô auditável entre Lote (produção) e InsumoEstoque (estoque),
 * armazenando a quantidade exata consumida para dar baixa rastreável.
 */
@Entity("consumo_insumo")
export class ConsumoInsumo extends EntidadeBase {
  @ManyToOne("Lote", "consumos", { onDelete: "CASCADE" })
  @JoinColumn({ name: "lote_id" })
  lote!: Relation<Lote>;

  @ManyToOne("InsumoEstoque")
  @JoinColumn({ name: "insumo_estoque_id" })
  insumoEstoque!: Relation<InsumoEstoque>;

  @Column({ type: "numeric", nullable: false })
  quantidade_consumida!: number;
}
