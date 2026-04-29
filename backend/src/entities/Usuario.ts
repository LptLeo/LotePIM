import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./base.entity.js";
import type { Lote } from "./Lote.js";
import type { InsumoEstoque } from "./InsumoEstoque.js";
import type { Inspecao } from "./Inspecao.js";
import type { Notificacao } from "./Notificacao.js";

export enum PerfilUsuario {
  OPERADOR = "operador",
  INSPETOR = "inspetor",
  GESTOR = "gestor",
}

@Entity("usuario")
export class Usuario extends EntidadeBase {
  @Column({ type: "text", nullable: false })
  nome!: string;

  @Index({ unique: true })
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

  @Column({ type: "text", nullable: true, select: false })
  refresh_token!: string | null;
  
  @Column({ type: "int", default: 20, nullable: false })
  alerta_estoque_porcentagem!: number;

  @ManyToOne("Usuario")
  @JoinColumn({ name: "criado_por_id" })
  criadoPor?: Relation<Usuario>;

  @OneToMany("Lote", "operador")
  lotes!: Relation<Lote>[];

  @OneToMany("InsumoEstoque", "operador")
  entradas_estoque!: Relation<InsumoEstoque>[];

  @OneToMany("Inspecao", "inspetor")
  inspecoes!: Relation<Inspecao>[];

  @OneToMany("Notificacao", "usuario")
  notificacoes!: Relation<Notificacao>[];
}