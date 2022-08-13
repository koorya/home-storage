import { MigrationInterface, QueryRunner } from "typeorm";

export class addPicture1660408519424 implements MigrationInterface {
    name = 'addPicture1660408519424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box" ADD "picturePath" character varying(32)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box" DROP COLUMN "picturePath"`);
    }

}
