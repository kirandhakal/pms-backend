import { MigrationInterface, QueryRunner } from "typeorm";
export class Notifications1794800000000 implements MigrationInterface {
 async up(q: QueryRunner): Promise<void> {
 await q.query(`CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar NOT NULL, title varchar NOT NULL, body text NOT NULL, "readAt" timestamptz, "createdAt" timestamp NOT NULL DEFAULT now())`);
 await q.query('CREATE INDEX notifications_user_created ON notifications ("userId", "createdAt")');
 }
 async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE notifications'); }
}
