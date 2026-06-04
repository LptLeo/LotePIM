import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { appDataSource } from '../../config/appDataSource.js';
import jwt from 'jsonwebtoken';
import { PerfilUsuario, Usuario } from '../../entities/Usuario.js';

let container: StartedPostgreSqlContainer;

export async function startTestContainer() {
  if (!container) {
    console.info('[test] Iniciando container PostgreSQL global...');
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_pass';
    process.env.DB_NAME = 'test_db';
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_only';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_only';
    process.env.JWT_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '7d';
    process.env.JWT_SALT = '10';

    console.info(
      `[test] Container pronto em ${process.env.DB_HOST}:${process.env.DB_PORT}`,
    );
  }

  if (!appDataSource.isInitialized) {
    appDataSource.setOptions({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      username: 'test_user',
      password: 'test_pass',
      database: 'test_db',
    });
    await appDataSource.initialize();
  }

  return container;
}

export async function stopTestContainer() {
  if (appDataSource.isInitialized) {
    await appDataSource.destroy();
  }
  if (container) {
    await container.stop();
  }
}

export async function limparBanco() {
  if (!appDataSource.isInitialized) return;
  const entities = appDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = appDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE "${entity.tableName}" CASCADE;`);
  }
}

export async function criarUsuarioTeste(perfil: PerfilUsuario = PerfilUsuario.GESTOR) {
  const userRepo = appDataSource.getRepository(Usuario);
  const user = userRepo.create({
    nome: `Usuario ${perfil}`,
    email: `${perfil}@teste.com`,
    senha_hash: 'hash_fake',
    perfil,
    ativo: true,
  });
  const salvo = await userRepo.save(user);

  const token = jwt.sign(
    { id: salvo.id, perfil: salvo.perfil, nome: salvo.nome },
    // Usa a mesma chave default do env.ts para NODE_ENV=test
    process.env.JWT_SECRET ?? 'test_secret_only',
    { expiresIn: '1h' },
  );

  return { usuario: salvo, token };
}
