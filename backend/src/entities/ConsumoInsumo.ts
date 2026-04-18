import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

import type { Lote } from "./Lote.js";
import type { InsumoEstoque } from "./InsumoEstoque.js";

/**
 * Registro de consumo de um lote de insumo em uma ordem de produção.
 * Serve como pivô auditável entre Lote (produção) e InsumoEstoque (estoque),
 * armazenando a quantidade exata consumida para dar baixa rastreável.
 */
@Entity("consumo_insumo")
export class ConsumoInsumo {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Lote", "consumos", { onDelete: "CASCADE" })
  @JoinColumn({ name: "lote_id" })
  lote!: Relation<Lote>;

  @ManyToOne("InsumoEstoque", { eager: true })
  @JoinColumn({ name: "insumo_estoque_id" })
  insumoEstoque!: Relation<InsumoEstoque>;

  @Column({ type: "numeric", nullable: false })
  quantidade_consumida!: number;

  @CreateDateColumn({ type: "timestamptz" })
  registrado_em!: Date;
}
