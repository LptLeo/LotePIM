import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Lote } from "./Lote.js";

@Entity("insumos_lote")
export class InsumoLote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Lote, (lote) => lote.insumos)
  lote!: Lote

  @Column({ type: "varchar", nullable: false })
  nome_insumo!: string;

  @Column({ type: "varchar", nullable: true })
  codigo_insumo?: string;

  @Column({ type: "varchar", nullable: true })
  lote_insumo?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  quantidade!: number;

  @Column({ type: "varchar", nullable: false })
  unidade!: string;

  @Column({ type: "varchar", nullable: false })
  lote_origem!: string;
}