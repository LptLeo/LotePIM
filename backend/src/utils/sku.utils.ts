import { type Repository, type ObjectLiteral } from 'typeorm';

export function gerarSku(nome: string, prefix: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12);

  return `${prefix}-${base}`;
}

export async function garantirSkuUnico<T extends ObjectLiteral>(
  repo: Repository<T>,
  field: keyof T,
  skuBase: string,
): Promise<string> {
  let sku = skuBase;
  let tentativa = 1;

  while (await repo.findOneBy({ [field]: sku } as Partial<T>)) {
    sku = `${skuBase}-${tentativa}`;
    tentativa++;
  }

  return sku;
}
