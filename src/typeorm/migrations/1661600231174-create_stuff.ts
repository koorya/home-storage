import { MigrationInterface, QueryRunner } from "typeorm";

export class createStuff1661600231174 implements MigrationInterface {
    name = 'createStuff1661600231174'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stuff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "description" text NOT NULL, "picturePath" character varying(32), "boxId" uuid, CONSTRAINT "PK_c1df5b5c9d1ed32d6684b292254" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "stuff" ADD CONSTRAINT "FK_39e2234545263ae73616866beae" FOREIGN KEY ("boxId") REFERENCES "box"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stuff" DROP CONSTRAINT "FK_39e2234545263ae73616866beae"`);
        await queryRunner.query(`DROP TABLE "stuff"`);
    }

}
