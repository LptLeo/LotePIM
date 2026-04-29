import {
  Column,
  Entity,
  Index,
} from "typeorm";

import { EntidadeBase } from "./base.entity.js";

/**
 * Catálogo central de materiais.
 * Representa o "conceito" do insumo — independente de lote físico.
 * Apenas o Gestor pode criar ou editar registros de catálogo.
 */

export enum UnidadeMedida {
  KG = "KG",
  L = "L",
  M = "M",
  UN = "UN",
}

@Entity("materia_prima")
export class MateriaPrima extends EntidadeBase {
  @Index()
  @Column({ type: "text", nullable: false })
  nome!: string;

  @Index({ unique: true })
  @Column({ type: "text", unique: true, nullable: false })
  sku_interno!: string;

  @Column({ type: "enum", enum: UnidadeMedida, nullable: false })
  unidade_medida!: UnidadeMedida;

  @Column({ type: "text", nullable: false })
  categoria!: string;
}
