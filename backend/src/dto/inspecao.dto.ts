import { z } from "zod";

export const registrarInspecaoSchema = z
  .object({
    quantidade_reprovada: z.coerce
      .number({ message: "A quantidade reprovada deve ser um número." })
      .int("A quantidade reprovada deve ser um número inteiro.")
      .min(0, "A quantidade reprovada não pode ser negativa."),

    descricao_desvio: z
      .string()
      .max(2000, "A descrição deve ter no máximo 2000 caracteres.")
      .optional()
      .default(""),
  })
  .refine(
    (data) =>
      data.quantidade_reprovada === 0 || !!data.descricao_desvio?.trim(),
    {
      message:
        "A descrição do desvio é obrigatória quando há itens reprovados.",
      path: ["descricao_desvio"],
    }
  );

export type RegistrarInspecaoDTO = z.infer<typeof registrarInspecaoSchema>;
