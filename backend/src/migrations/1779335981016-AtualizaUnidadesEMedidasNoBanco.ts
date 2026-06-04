import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AtualizaUnidadesEMedidasNoBanco1779335981016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // O PostgreSQL exige um COMMIT antes que novos valores de ENUM possam ser usados.
    // Por isso, fazemos o ALTER TYPE fora da transação e depois abrimos uma nova.
    await queryRunner.commitTransaction();

    await queryRunner.query(
      `ALTER TYPE materia_prima_unidade_medida_enum ADD VALUE IF NOT EXISTS 'G';`,
    );
    await queryRunner.query(
      `ALTER TYPE materia_prima_unidade_medida_enum ADD VALUE IF NOT EXISTS 'ML';`,
    );

    // Reabre a transação para garantir que os UPDATEs sejam atômicos
    await queryRunner.startTransaction();

    await queryRunner.query(
      `UPDATE materia_prima SET unidade_medida = 'G' WHERE unidade_medida = 'KG';`,
    );
    await queryRunner.query(
      `UPDATE materia_prima SET unidade_medida = 'ML' WHERE unidade_medida = 'L';`,
    );

    await queryRunner.query(
      `UPDATE receita_item SET quantidade = quantidade * 1000, unidade = 'G' WHERE unidade = 'KG';`,
    );
    await queryRunner.query(
      `UPDATE receita_item SET quantidade = quantidade * 1000, unidade = 'ML' WHERE unidade = 'L';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE receita_item SET quantidade = quantidade / 1000, unidade = 'KG' WHERE unidade = 'G';`,
    );
    await queryRunner.query(
      `UPDATE receita_item SET quantidade = quantidade / 1000, unidade = 'L' WHERE unidade = 'ML';`,
    );

    await queryRunner.query(
      `UPDATE materia_prima SET unidade_medida = 'KG' WHERE unidade_medida = 'G';`,
    );
    await queryRunner.query(
      `UPDATE materia_prima SET unidade_medida = 'L' WHERE unidade_medida = 'ML';`,
    );
  }
}
