import { z } from 'zod';

const turnoSchema = z.enum(['manha', 'tarde', 'noite'], {
  message: 'Selecione um turno válido (Manhã, Tarde ou Noite).',
});

const consumoItemSchema = z.object({
  insumo_estoque_id: z.coerce
    .number()
    .int()
    .positive('Selecione um lote de estoque válido para este insumo.'),
  quantidade_consumida: z.coerce
    .number()
    .positive('A quantidade deve ser maior que zero.'),
});

export const criarLoteSchema = z.object({
  produto_id: z.coerce
    .number()
    .int()
    .positive('Selecione um produto para iniciar a produção.'),

  data_producao: z.string().min(1, 'A data de produção é obrigatória.'),

  turno: turnoSchema,

  quantidade_planejada: z.coerce
    .number()
    .int('A quantidade produzida deve ser um número inteiro.')
    .positive('A quantidade deve ser maior que zero.'),

  data_validade: z.string().optional().nullable(),

  sem_validade: z.boolean().optional(),

  observacoes: z
    .string()
    .max(1000, 'A observação deve ter no máximo 1000 caracteres.')
    .optional(),

  consumos: z
    .array(consumoItemSchema)
    .min(1, 'É obrigatório vincular pelo menos 1 lote de insumo à produção.'),
});

export type CriarLoteFormData = z.infer<typeof criarLoteSchema>;
