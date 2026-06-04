import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConverteKgELitrosParaGramasEMililitros1779335460893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE insumo_estoque
            SET quantidade_inicial = quantidade_inicial * 1000,
                quantidade_atual = quantidade_atual * 1000;    
        `);

    await queryRunner.query(`
            UPDATE consumo_insumo
            SET quantidade_consumida = quantidade_consumida * 1000;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE insumo_estoque
            SET quantidade_inicial = quantidade_inicial / 1000,
                quantidade_atual = quantidade_atual / 1000;
        `);

    await queryRunner.query(`
            UPDATE consumo_insumo
            SET quantidade_consumida = quantidade_consumida / 1000;
        `);
  }
}
