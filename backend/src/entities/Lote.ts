import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Produto } from "./Produto.js";
import { Usuario } from "./Usuario.js";
import { InsumoLote } from "./InsumoLote.js";
import { InspecaoLote } from "./InspecaoLote.js";

export enum Turno {
  MANHA = "manha",
  TARDE = "tarde",
  NOITE = "noite",
}

export enum LoteStatus {
  EM_PRODUCAO = "em_producao",
  AGUARDANDO_INSPECAO = "aguardando_inspecao",
  APROVADO = "aprovado",
  APROVADO_RESTRICAO = "aprovado_restricao",
  REPROVADO = "reprovado",
}

@Entity("lote")
export class Lote {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: "text", unique: true, nullable: false })
  numero_lote!: string

  @ManyToOne(() => Produto, (produto) => produto.lotes)
  @JoinColumn({ name: "produto_id" })
  produto!: Produto;

  @Column({ type: "date", nullable: false })
  data_producao!: Date

  @Column({ type: "enum", enum: Turno, nullable: false })
  turno!: Turno

  @ManyToOne(() => Usuario, (usuario) => usuario.lotes)
  @JoinColumn({ name: "operador_id" })
  operador!: Usuario;

  @Column({ type: "int", nullable: false })
  quantidade_prod!: number

  @Column({ type: "int", nullable: false, default: 0 })
  quantidade_repr!: number

  @Column({ type: "enum", enum: LoteStatus, nullable: false })
  status!: LoteStatus

  @Column({ type: "text", nullable: true })
  observacoes?: string

  @Column({ type: "timestamptz", nullable: false, default: () => "CURRENT_TIMESTAMP" })
  aberto_em!: Date

  @Column({ type: "timestamptz", nullable: true })
  encerrado_em?: Date

  @OneToMany(() => InsumoLote, (insumo) => insumo.lote)
  insumos!: InsumoLote[]

  @OneToOne(() => InspecaoLote, (inspecao) => inspecao.lote)
  inspecao!: InspecaoLote
}