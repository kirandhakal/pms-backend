"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notifications1794800000000 = void 0;
class Notifications1794800000000 {
    async up(q) {
        await q.query(`CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar NOT NULL, title varchar NOT NULL, body text NOT NULL, "readAt" timestamptz, "createdAt" timestamp NOT NULL DEFAULT now())`);
        await q.query('CREATE INDEX notifications_user_created ON notifications ("userId", "createdAt")');
    }
    async down(q) { await q.query('DROP TABLE notifications'); }
}
exports.Notifications1794800000000 = Notifications1794800000000;
