import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Lote } from "./Lote.js";
import { InspecaoLote } from "./InspecaoLote.js";

export enum PerfilUsuario {
  OPERADOR = "operador",
  INSPETOR = "inspetor",
  GESTOR = "gestor"
}

@Entity("usuario")
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', nullable: false })
  nome!: string;

  // Email e senha serão usados tanto para registro quanto para login
  @Column({ type: 'text', unique: true, nullable: false })
  email!: string;

  @Column({ type: 'text', nullable: false, select: false })
  senha_hash!: string;

  @Column({
    type: "enum",
    enum: PerfilUsuario,
    default: PerfilUsuario.OPERADOR,
    nullable: false
  })
  perfil!: PerfilUsuario;

  @Column({ type: 'boolean', default: true, nullable: false })
  ativo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @OneToMany(() => Lote, (lote) => lote.operador)
  lotes!: Lote[];

  @OneToMany(() => InspecaoLote, (inspecao) => inspecao.inspetor)
  inspecoes!: InspecaoLote[];
}