import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOrganizationIdInInvitationsTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set a default value for existing rows
    await queryRunner.query(
      `UPDATE "invitations" SET "organizationId" = '<DEFAULT_ORGANIZATION_ID>' WHERE "organizationId" IS NULL;`
    );

    // Apply NOT NULL constraint
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "organizationId" SET NOT NULL;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove NOT NULL constraint in case of rollback
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "organizationId" DROP NOT NULL;`
    );
  }
}