import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Lote } from "./Lote.js";
import { Usuario } from "./Usuario.js";

enum Resultados {
  aprovado = "aprovado",
  aprovado_restricao = "aprovado_restricao",
  reprovado = "reprovado"
}

@Entity("inspecao_lote")
export class InspecaoLote {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @OneToOne(() => Lote, (lote) => lote.inspecao)
  lote_id!: Lote

  @ManyToOne(() => Usuario, (usuario) => usuario.inspecoes)
  inspetor_id!: Usuario

  @Column({ type: "enum", enum: Resultados, nullable: false })
  resultado!: Resultados

  @Column({ type: "int", nullable: false, default: 0 })
  quantidade_reprovada!: number

  @Column({ type: "text", nullable: true })
  descricao_desvio!: string

  @Column({ type: "timestamp", nullable: false, default: () => "CURRENT_TIMESTAMP" })
  inspecionado_em!: Date
}