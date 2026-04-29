import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Index,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./base.entity.js";
import type { MateriaPrima } from "./MateriaPrima.js";
import type { Usuario } from "./Usuario.js";

export enum Turno {
  MANHA = "manha",
  TARDE = "tarde",
  NOITE = "noite",
}

/**
 * Representa um lote físico de matéria-prima recebido no estoque.
 * Rastreia a quantidade original e o saldo atual após consumos.
 */
@Entity("insumo_estoque")
export class InsumoEstoque extends EntidadeBase {
  @ManyToOne("MateriaPrima")
  @JoinColumn({ name: "materia_prima_id" })
  materiaPrima!: Relation<MateriaPrima>;

  @Column({ type: "text", nullable: true })
  numero_lote_fornecedor!: string;

  @Index({ unique: true })
  @Column({ type: "text", unique: true, nullable: false })
  numero_lote_interno!: string;

  @Column({ type: "numeric", nullable: false })
  quantidade_inicial!: number;

  @Column({ type: "numeric", nullable: false })
  quantidade_atual!: number;

  @Column({ type: "text", nullable: false })
  fornecedor!: string;

  @Column({ type: "text", nullable: true })
  codigo_interno!: string;

  @Column({ type: "enum", enum: Turno, nullable: false })
  turno!: Turno;

  @ManyToOne("Usuario", "entradas_estoque")
  @JoinColumn({ name: "operador_id" })
  operador!: Relation<Usuario>;

  @Column({ type: "date", nullable: true })
  data_validade!: Date | null;

  @Column({ type: "text", nullable: true })
  observacoes!: string;

  @Index()
  @Column({
    type: "timestamptz",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  recebido_em!: Date;
}
