import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Lote } from "./Lote.js";

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true, nullable: false })
  codigo!: string;

  @Column({ type: 'text', nullable: false })
  nome!: string

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ type: 'text', nullable: false })
  linha!: string

  @Column({ type: 'boolean', default: true })
  ativo!: boolean

  // Relacionamento 1:N com Lote, um produto pode ter vários lotes
  @OneToMany(() => Lote, (lote) => lote.produto)
  lotes!: Lote[];
}