import { z } from 'zod';
import { UnidadeMedida } from '../entities/MateriaPrima.js';

export const criarMateriaPrimaSchema = z.object({
  nome: z.string().min(2),
  unidade_medida: z.enum(UnidadeMedida, {
    error: 'Unidade de medida inválida.',
  }),
  categoria: z.string().min(1),
});

export type CriarMateriaPrimaDTO = z.infer<typeof criarMateriaPrimaSchema>;
