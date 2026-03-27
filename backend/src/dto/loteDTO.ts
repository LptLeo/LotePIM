import { Turno } from "../entities/Lote.js";

// O formulário de abertura de lote registra produto, data, turno, operador e quantidade produzida.
// O número do lote é gerado automaticamente.

export interface LoteDTO {
  produto: string;
  data: Date;
  turno: Turno;
  operador: string;
  quantidade: number;
}