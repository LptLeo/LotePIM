import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  type Relation,
} from "typeorm";

import type { Lote } from "./Lote.js";
import type { InsumoEstoque } from "./InsumoEstoque.js";
import type { Inspecao } from "./Inspecao.js";

export enum PerfilUsuario {
  OPERADOR = "operador",
  INSPETOR = "inspetor",
  GESTOR = "gestor",
}

@Entity("usuario")
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", nullable: false })
  nome!: string;

  @Column({ type: "text", unique: true, nullable: false })
  email!: string;

  @Column({ type: "text", nullable: false, select: false })
  senha_hash!: string;

  @Column({
    type: "enum",
    enum: PerfilUsuario,
    default: PerfilUsuario.OPERADOR,
    nullable: false,
  })
  perfil!: PerfilUsuario;

  @Column({ type: "boolean", default: true, nullable: false })
  ativo!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  criado_em!: Date;

  @OneToMany("Lote", "operador")
  lotes!: Relation<Lote>[];

  @OneToMany("InsumoEstoque", "operador")
  entradas_estoque!: Relation<InsumoEstoque>[];

  @OneToMany("Inspecao", "inspetor")
  inspecoes!: Relation<Inspecao>[];
}