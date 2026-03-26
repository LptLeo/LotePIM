import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Produto } from "./Produto.js";
import { Usuario } from "./Usuario.js";
import { InsumoLote } from "./InsumoLote.js";
import { InspecaoLote } from "./InspecaoLote.js";

enum Turno {
  manha = "manha",
  tarde = "tarde",
  noite = "noite",
}

enum LoteStatus {
  em_producao = "em_producao",
  aguardando_inspecao = "aguardando_inspecao",
  aprovado = "aprovado",
  aprovado_restricao = "aprovado_restricao",
  reprovado = "reprovado",
}

@Entity("lote")
export class Lote {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "text", unique: true, nullable: false })
  numero_lote!: string

  @ManyToOne(() => Produto, (produto) => produto.lotes)
  produto_id!: string

  @Column({ type: "date", nullable: false })
  data_producao!: Date

  @Column({ type: "enum", enum: Turno, nullable: false })
  turno!: Turno

  @ManyToOne(() => Usuario, (usuario) => usuario.lotes)
  operador_id!: string

  @Column({ type: "int", nullable: false })
  quantidade_produzida!: number

  @Column({ type: "int", nullable: false, default: 0 })
  quantidade_reprovada!: number

  @Column({ type: "enum", enum: LoteStatus, nullable: false, default: LoteStatus.em_producao })
  status!: LoteStatus

  @Column({ type: "text", nullable: true })
  observacoes?: string

  @Column({ type: "timestamp", nullable: false, default: () => "CURRENT_TIMESTAMP" })
  aberto_em!: Date

  @Column({ type: "timestamp", nullable: true })
  encerrado_em?: Date

  @OneToMany(() => InsumoLote, (insumo) => insumo.lote)
  insumos!: InsumoLote[]

  @OneToOne(() => InspecaoLote, (inspecao) => inspecao.lote)
  inspecao!: InspecaoLote
}