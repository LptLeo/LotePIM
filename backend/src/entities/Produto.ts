import { Column, Entity, OneToMany, ManyToMany, JoinTable, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, type Relation } from "typeorm";
import type { Lote } from "./Lote.js";
import type { Insumo } from "./Insumo.js";

@Entity('produto')
export class Produto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true, nullable: false })
  codigo!: string;

  @Column({ type: 'text', nullable: false })
  nome!: string

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ type: 'text', nullable: false })
  linha!: string

  @Column({ type: 'text', default: '1.0.0' })
  versao!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean

  @CreateDateColumn()
  criado_em!: Date;

  @UpdateDateColumn()
  atualizado_em!: Date;

  // Relacionamento 1:N com Lote
  @OneToMany("Lote", "produto")
  lotes!: Relation<Lote>[];

  // Relacionamento M:N com Insumo (Insumos Padrão)
  @ManyToMany("Insumo")
  @JoinTable({
    name: "produto_insumos_padrao",
    joinColumn: { name: "produto_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "insumo_id", referencedColumnName: "id" }
  })
  insumos_padrao!: Relation<Insumo>[];
}