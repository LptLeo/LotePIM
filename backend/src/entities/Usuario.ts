import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Lote } from "./Lote";

export enum PerfilUsuario {
  OPERADOR = "operador",
  INSPETOR = "inspetor",
  GESTOR = "gestor"
}

@Entity("usuario")
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  nome!: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email!: string;

  @Column({ type: 'varchar', select: false, nullable: false })
  senha!: string;

  @Column({
    type: "enum",
    enum: PerfilUsuario,
    default: PerfilUsuario.OPERADOR,
    nullable: false
  })
  perfil!: PerfilUsuario;

  @Column({ type: 'boolean', default: true, nullable: false })
  ativo!: boolean;

  @OneToMany(() => Lote, (lote) => lote.usuario)
  lotes!: Lote[];
}