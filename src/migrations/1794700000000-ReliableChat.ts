import { MigrationInterface, QueryRunner } from "typeorm";
export class ReliableChat1794700000000 implements MigrationInterface {
 async up(q: QueryRunner): Promise<void> {
  for (const [table, scope, sender] of [["direct_messages","recipientId","senderId"],["channel_messages","channelId","userId"],["task_comments","taskId","userId"]]) {
   await q.query(`ALTER TABLE "${table}" ADD COLUMN "clientMessageId" uuid, ADD COLUMN "chatSequence" BIGSERIAL`);
   await q.query(`WITH ranked AS (SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n FROM "${table}") UPDATE "${table}" AS m SET "chatSequence" = ranked.n FROM ranked WHERE m.id = ranked.id`);
   await q.query(`CREATE UNIQUE INDEX "${table}_chat_retry" ON "${table}" ("${scope}", "${sender}", "clientMessageId")`);
   await q.query(`CREATE INDEX "${table}_chat_history" ON "${table}" ("${scope}", "chatSequence")`);
  }
  await q.query(`CREATE TABLE project_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "clientMessageId" uuid NOT NULL, "chatSequence" BIGSERIAL, body text NOT NULL, "isDeleted" boolean NOT NULL DEFAULT false, "createdAt" timestamp NOT NULL DEFAULT now(), UNIQUE ("projectId", "userId", "clientMessageId"))`);
  await q.query(`CREATE INDEX project_messages_chat_history ON project_messages ("projectId", "chatSequence")`);
 }
 async down(q: QueryRunner): Promise<void> {
  await q.query('DROP TABLE project_messages');
  for (const table of ["direct_messages","channel_messages","task_comments"]) {
   await q.query(`DROP INDEX "${table}_chat_retry"`);
   await q.query(`DROP INDEX "${table}_chat_history"`);
   await q.query(`ALTER TABLE "${table}" DROP COLUMN "clientMessageId", DROP COLUMN "chatSequence"`);
  }
 }
}
