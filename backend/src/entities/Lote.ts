import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./EntidadeBase.js";
import type { Produto } from "./Produto.js";
import type { Usuario } from "./Usuario.js";
import type { ConsumoInsumo } from "./ConsumoInsumo.js";
import type { Inspecao } from "./Inspecao.js";

export { Turno } from "./InsumoEstoque.js";

export enum LoteStatus {
  EM_PRODUCAO = "em_producao",
  AGUARDANDO_INSPECAO = "aguardando_inspecao",
  APROVADO = "aprovado",
  APROVADO_RESTRICAO = "aprovado_restricao",
  REPROVADO = "reprovado",
}

/**
 * Ordem de produção que transforma matéria-prima em produto acabado.
 * O status progride automaticamente via Job de progressão.
 */
@Entity("lote")
export class Lote extends EntidadeBase {
  @Column({ type: "text", unique: true, nullable: false })
  numero_lote!: string;

  @ManyToOne("Produto", "lotes")
  @JoinColumn({ name: "produto_id" })
  produto!: Relation<Produto>;

  @Column({ type: "int", nullable: false })
  quantidade_planejada!: number;

  @Column({ type: "enum", enum: LoteStatus, nullable: false })
  status!: LoteStatus;

  @Column({
    type: "enum",
    enum: ["manha", "tarde", "noite"],
    nullable: false,
  })
  turno!: string;

  @ManyToOne("Usuario", "lotes")
  @JoinColumn({ name: "operador_id" })
  operador!: Relation<Usuario>;

  @Column({ type: "date", nullable: false })
  data_producao!: Date;

  @Column({ type: "date", nullable: true })
  data_validade!: Date | null;

  @Column({ type: "text", nullable: true })
  observacoes!: string;

  @Column({ type: "timestamptz", nullable: false, default: () => "CURRENT_TIMESTAMP" })
  aberto_em!: Date;

  @Column({ type: "timestamptz", nullable: true })
  encerrado_em!: Date | null;

  @OneToMany("ConsumoInsumo", "lote")
  consumos!: Relation<ConsumoInsumo>[];

  @OneToOne("Inspecao", "lote")
  inspecao!: Relation<Inspecao>;
}
