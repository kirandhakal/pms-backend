"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactSubmissions1795000000000 = void 0;
class ContactSubmissions1795000000000 {
    constructor() {
        this.name = "ContactSubmissions1795000000000";
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "public"."contact_submissions_status_enum" AS ENUM('NEW', 'READ', 'RESOLVED')`);
        await queryRunner.query(`CREATE TABLE "contact_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(180) NOT NULL, "subject" character varying(160) NOT NULL, "message" text NOT NULL, "status" "public"."contact_submissions_status_enum" NOT NULL DEFAULT 'NEW', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_contact_submissions" PRIMARY KEY ("id"))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "contact_submissions"`);
        await queryRunner.query(`DROP TYPE "public"."contact_submissions_status_enum"`);
    }
}
exports.ContactSubmissions1795000000000 = ContactSubmissions1795000000000;
