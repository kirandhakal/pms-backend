"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixOrganizationIdInInvitationsTable = void 0;
class FixOrganizationIdInInvitationsTable {
    async up(queryRunner) {
        // Set a default value for existing rows
        await queryRunner.query(`UPDATE "invitations" SET "organizationId" = '<DEFAULT_ORGANIZATION_ID>' WHERE "organizationId" IS NULL;`);
        // Apply NOT NULL constraint
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "organizationId" SET NOT NULL;`);
    }
    async down(queryRunner) {
        // Remove NOT NULL constraint in case of rollback
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "organizationId" DROP NOT NULL;`);
    }
}
exports.FixOrganizationIdInInvitationsTable = FixOrganizationIdInInvitationsTable;
