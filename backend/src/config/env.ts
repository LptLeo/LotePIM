import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('postgres'),
  JWT_SECRET: z
    .string()
    .default(process.env.NODE_ENV === 'test' ? 'test_secret_only' : ''),
  JWT_REFRESH_SECRET: z
    .string()
    .default(process.env.NODE_ENV === 'test' ? 'test_refresh_secret_only' : ''),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  JWT_SALT: z.coerce.number().default(10),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:4200')
    .transform((v) => v.split(',').map((url) => url.trim().replace(/\/$/, ''))),
  TEMPO_PRODUCAO_MINUTOS: z.coerce.number().default(2),
  SENHA_MIN_LENGTH: z.coerce.number().default(8),
  SENHA_MAX_LENGTH: z.coerce.number().default(32),
  TAMANHO_SENHA_GERADA: z.coerce.number().default(12),
  ALERTA_ESTOQUE_BAIXO_PORCENTAGEM: z.coerce.number().default(20),
  LIMITE_MAXIMO_LOTES_ATIVOS: z.coerce.number().default(100),
  ITENS_POR_PAGINA_PADRAO: z.coerce.number().default(10),
  DIAS_MAXIMOS_RASTREABILIDADE: z.coerce.number().default(365),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    'Falha na validação das variáveis de ambiente do sistema. Variáveis de ambiente inválidas: \n',
  );

  _env.error.issues.forEach((issue) => {
    const campo = issue.path.join('.');
    console.error(`${campo}: ${issue.message}`);
  });

  process.exit(1); // Silenciando o erro padrão para exibir apenas a mensagem de erro configurada.
}

export const env = _env.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
