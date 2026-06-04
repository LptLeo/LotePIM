import {
  type EntityManager,
  type EntityTarget,
  type FindOptionsWhere,
  type FindOneOptions,
  type ObjectLiteral,
  type Repository,
} from 'typeorm';
import { AppError } from '../errors/AppError.js';

export async function findOneByOrFail<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: FindOptionsWhere<T>,
  entityName: string,
  statusCode = 404,
): Promise<T> {
  const entity = await repo.findOneBy(where);
  if (!entity) throw new AppError(`${entityName} não encontrado(a).`, statusCode);
  return entity;
}

export async function findOneOrFail<T extends ObjectLiteral>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  entityName: string,
  statusCode = 404,
): Promise<T> {
  const entity = await repo.findOne(options);
  if (!entity) throw new AppError(`${entityName} não encontrado(a).`, statusCode);
  return entity;
}

export async function listarColunasDistintas<TValue>(
  repo: Repository<ObjectLiteral>,
  alias: string,
  column: string,
): Promise<TValue[]> {
  const resultados = await repo
    .createQueryBuilder(alias)
    .select(`${alias}.${column}`)
    .distinct(true)
    .orderBy(`${alias}.${column}`, 'ASC')
    .getRawMany();

  return resultados.map((r) => r[column] as TValue);
}

export async function managerFindOneByOrFail<T extends ObjectLiteral>(
  manager: EntityManager,
  entityClass: EntityTarget<T>,
  where: FindOptionsWhere<T>,
  errorOptions?: { entityName?: string; statusCode?: number },
): Promise<T> {
  const entity = await manager.findOneBy(entityClass, where);
  if (!entity)
    throw new AppError(
      `${errorOptions?.entityName ?? 'Entidade'} não encontrado(a).`,
      errorOptions?.statusCode ?? 404,
    );
  return entity;
}

export async function managerFindOneOrFail<T extends ObjectLiteral>(
  manager: EntityManager,
  entityClass: EntityTarget<T>,
  options: FindOneOptions<T>,
  errorOptions?: { entityName?: string; statusCode?: number },
): Promise<T> {
  const entity = await manager.findOne(entityClass, options);
  if (!entity)
    throw new AppError(
      `${errorOptions?.entityName ?? 'Entidade'} não encontrado(a).`,
      errorOptions?.statusCode ?? 404,
    );
  return entity;
}
