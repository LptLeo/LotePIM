import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Classe base para todas as entidades do sistema.
 * Garante padronização dos campos de auditoria e identificação.
 */
export abstract class EntidadeBase {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: "timestamptz" })
  criado_em!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  atualizado_em!: Date;
}
