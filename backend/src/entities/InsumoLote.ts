import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Lote } from "./Lote.js";

@Entity("insumos_lote")
export class InsumoLote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", nullable: false })
  nome_insumo!: string;

  @Column({ type: "varchar", nullable: false })
  codigo_insumo!: string;

  @Column({ type: "varchar", nullable: false })
  lote_fornecedor!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  quantidade_usada!: number;

  @Column({ type: "varchar", nullable: false })
  unidade_medida!: string;

  @ManyToOne(() => Lote, (lote) => lote.insumos)
  lote!: Lote
}