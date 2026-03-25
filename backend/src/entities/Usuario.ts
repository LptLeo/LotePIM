import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum PerfilUsuario {
  OPERADOR = "operador",
  INSPETOR = "inspetor",
  GESTOR = "gestor"
}

@Entity("usuario")
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: false })
  nome!: string;

  @Column({ type: 'text', unique: true, nullable: false })
  email!: string;

  @Column({ type: 'text', select: false, nullable: false })
  senha!: string;

  @Column({
    type: "enum",
    enum: PerfilUsuario,
    default: PerfilUsuario.OPERADOR,
    nullable: false
  })
  perfil!: PerfilUsuario;

  @CreateDateColumn({ type: 'timestamp', nullable: false })
  criado_em!: Date;
}