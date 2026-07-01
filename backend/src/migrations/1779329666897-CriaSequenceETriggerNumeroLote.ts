import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CriaSequenceETriggerNumeroLote1779329666897 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS lote_numero_seq;
        `);

    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION gerar_numero_lote_trigger()
            RETURNS TRIGGER AS $$
            BEGIN
            IF NEW.numero_lote IS NULL OR NEW.numero_lote = '' THEN
                NEW.numero_lote := 'LOT-' || TO_CHAR(NEW.data_producao, 'DDMMYYYY') || '-' || nextval('lote_numero_seq');
            END IF;
            RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    await queryRunner.query(`
            CREATE TRIGGER tg_gerar_numero_lote
            BEFORE INSERT ON lote
            FOR EACH ROW
            EXECUTE FUNCTION gerar_numero_lote_trigger();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TRIGGER IF EXISTS tg_gerar_numero_lote ON lote;`);
    await queryRunner.query(`
            DROP FUNCTION IF EXISTS gerar_numero_lote_trigger();`);
    await queryRunner.query(`
            DROP SEQUENCE IF EXISTS lote_numero_seq;`);
  }
}
