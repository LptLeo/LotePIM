import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

import type { MateriaPrima } from "./MateriaPrima.js";
import type { Usuario } from "./Usuario.js";

export enum Turno {
  MANHA = "manha",
  TARDE = "tarde",
  NOITE = "noite",
}

/**
 * Representa a entrada física de um material no estoque.
 * Cada registro é um lote recebido do fornecedor, com número de
 * rastreamento interno gerado automaticamente pelo sistema.
 */
@Entity("insumo_estoque")
export class InsumoEstoque {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("MateriaPrima", { eager: true })
  @JoinColumn({ name: "materia_prima_id" })
  materiaPrima!: Relation<MateriaPrima>;

  @Column({ type: "text", nullable: true })
  numero_lote_fornecedor!: string;

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

  @Column({ type: "boolean", default: true })
  ativo!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  recebido_em!: Date;
}
