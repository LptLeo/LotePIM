import 'reflect-metadata';
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres",
  entities: [process.env.NODE_ENV === 'development'
    ? "src/entities/**/*.{ts,js}"
    : "dist/entities/**/*.{js}"],
  migrations: [process.env.NODE_ENV === 'development'
    ? "src/migrations/**/*.{ts,js}"
    : "dist/migrations/**/*.{js}"],
  subscribers: [],
  synchronize: process.env.NODE_ENV === "development",
  logging: true,
});