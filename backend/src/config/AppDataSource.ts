import 'reflect-metadata';
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { join } from 'path';
import { ConsumoInsumo } from "../entities/ConsumoInsumo.js";
import { Inspecao } from "../entities/Inspecao.js";
import { InsumoEstoque } from "../entities/InsumoEstoque.js";
import { Lote } from "../entities/Lote.js";
import { MateriaPrima } from "../entities/MateriaPrima.js";
import { Notificacao } from "../entities/Notificacao.js";
import { Produto } from "../entities/Produto.js";
import { ReceitaItem } from "../entities/ReceitaItem.js";
import { Usuario } from "../entities/Usuario.js";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres",
  entities: [
    ConsumoInsumo,
    Inspecao,
    InsumoEstoque,
    Lote,
    MateriaPrima,
    Notificacao,
    Produto,
    ReceitaItem,
    Usuario
  ],
  migrations: [
    join(process.cwd(), process.env.NODE_ENV === 'development'
      ? "src/migrations/**/*.{ts,js}"
      : "dist/migrations/**/*.{js}")
  ],
  subscribers: [],
  synchronize: process.env.NODE_ENV === "development",
  logging: false,
});