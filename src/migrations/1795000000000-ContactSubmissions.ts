import { MigrationInterface, QueryRunner } from "typeorm";

export class ContactSubmissions1795000000000 implements MigrationInterface {
  name = "ContactSubmissions1795000000000";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."contact_submissions_status_enum" AS ENUM('NEW', 'READ', 'RESOLVED')`);
    await queryRunner.query(`CREATE TABLE "contact_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(180) NOT NULL, "subject" character varying(160) NOT NULL, "message" text NOT NULL, "status" "public"."contact_submissions_status_enum" NOT NULL DEFAULT 'NEW', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_contact_submissions" PRIMARY KEY ("id"))`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contact_submissions"`);
    await queryRunner.query(`DROP TYPE "public"."contact_submissions_status_enum"`);
  }
}
