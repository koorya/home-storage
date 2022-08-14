import { MigrationInterface, QueryRunner } from "typeorm";

export class boxRelations1660412426082 implements MigrationInterface {
    name = 'boxRelations1660412426082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "box_closure" ("id_ancestor" uuid NOT NULL, "id_descendant" uuid NOT NULL, CONSTRAINT "PK_72c25f8164a0644a3c05ae80c30" PRIMARY KEY ("id_ancestor", "id_descendant"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c25fffa8505de7c36db7eef3e8" ON "box_closure" ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd2a072669907b8c2479ee6c8b" ON "box_closure" ("id_descendant") `);
        await queryRunner.query(`ALTER TABLE "box" ADD "parentId" uuid`);
        await queryRunner.query(`ALTER TABLE "box" ADD CONSTRAINT "FK_565b1bfdf5c76b3ab5d6733afc7" FOREIGN KEY ("parentId") REFERENCES "box"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "box_closure" ADD CONSTRAINT "FK_c25fffa8505de7c36db7eef3e80" FOREIGN KEY ("id_ancestor") REFERENCES "box"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "box_closure" ADD CONSTRAINT "FK_dd2a072669907b8c2479ee6c8be" FOREIGN KEY ("id_descendant") REFERENCES "box"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_closure" DROP CONSTRAINT "FK_dd2a072669907b8c2479ee6c8be"`);
        await queryRunner.query(`ALTER TABLE "box_closure" DROP CONSTRAINT "FK_c25fffa8505de7c36db7eef3e80"`);
        await queryRunner.query(`ALTER TABLE "box" DROP CONSTRAINT "FK_565b1bfdf5c76b3ab5d6733afc7"`);
        await queryRunner.query(`ALTER TABLE "box" DROP COLUMN "parentId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd2a072669907b8c2479ee6c8b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c25fffa8505de7c36db7eef3e8"`);
        await queryRunner.query(`DROP TABLE "box_closure"`);
    }

}
