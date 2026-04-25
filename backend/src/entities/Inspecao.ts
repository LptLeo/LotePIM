import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  type Relation,
} from "typeorm";

import { EntidadeBase } from "./EntidadeBase.js";
import type { Lote } from "./Lote.js";
import type { Usuario } from "./Usuario.js";

export enum ResultadoInspecao {
  APROVADO = "aprovado",
  APROVADO_RESTRICAO = "aprovado_restricao",
  REPROVADO = "reprovado",
}

/**
 * Registro de inspeção de qualidade de um lote de produção.
 * O resultado é calculado automaticamente pelo service com base
 * no percentual_ressalva do Produto — o frontend não envia o resultado.
 */
@Entity("inspecao")
export class Inspecao extends EntidadeBase {
  @OneToOne("Lote", "inspecao")
  @JoinColumn({ name: "lote_id" })
  lote!: Relation<Lote>;

  @ManyToOne("Usuario", "inspecoes")
  @JoinColumn({ name: "inspetor_id" })
  inspetor!: Relation<Usuario>;

  @Column({ type: "int", nullable: false, default: 0 })
  quantidade_reprovada!: number;

  @Column({ type: "enum", enum: ResultadoInspecao, nullable: false })
  resultado_calculado!: ResultadoInspecao;

  @Column({ type: "text", nullable: true })
  descricao_desvio!: string;
}
