import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Produto } from "./Produto";
import { Usuario } from "./Usuario";
import { InsumoLote } from "./InsumoLote";
import { InspecaoLote } from "./InspecaoLote";

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
  @PrimaryGeneratedColumn()
  id!: string

  @Column({ type: "varchar", nullable: false })
  numero_lote!: string

  @Column({ type: "date", nullable: false })
  data_producao!: Date

  @Column({ type: "enum", enum: Turno, nullable: false })
  turno!: Turno

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

  @ManyToOne(() => Produto, (produto) => produto.lotes)
  produto!: Produto

  @ManyToOne(() => Usuario, (usuario) => usuario.lotes)
  usuario!: Usuario

  @OneToMany(() => InsumoLote, (insumo) => insumo.lote)
  insumos!: InsumoLote[]

  @OneToOne(() => InspecaoLote, (inspecao) => inspecao.lote)
  inspecao!: InspecaoLote
}