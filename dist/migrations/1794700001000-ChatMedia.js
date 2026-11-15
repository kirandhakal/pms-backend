"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMedia1794700001000 = void 0;
class ChatMedia1794700001000 {
    async up(q) {
        await q.query('ALTER TABLE channels ADD COLUMN "allowedFileTypes" jsonb');
        for (const table of ["direct_messages", "channel_messages", "task_comments", "project_messages"]) {
            await q.query(`ALTER TABLE "${table}" ADD COLUMN "chatVersion" bigint NOT NULL DEFAULT 0, ADD COLUMN "replyToMessageId" uuid, ADD COLUMN "pinnedAt" timestamptz, ADD COLUMN "pinnedById" uuid, ADD COLUMN "chatUpdatedAt" timestamptz NOT NULL DEFAULT now()`);
        }
        await q.query(`CREATE TABLE chat_attachments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "conversationKey" varchar NOT NULL,
            "uploaderId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            "objectKey" varchar NOT NULL UNIQUE, name varchar(200) NOT NULL,
            "mimeType" varchar NOT NULL, size integer NOT NULL CHECK (size > 0),
            "messageId" uuid, status varchar NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','uploading','ready','deleted')),
            "expiresAt" timestamptz NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now())`);
        await q.query('CREATE INDEX chat_attachments_conversation_message ON chat_attachments ("conversationKey", "messageId")');
        await q.query('CREATE TABLE chat_events (sequence BIGSERIAL PRIMARY KEY, "conversationKey" varchar NOT NULL, "messageId" uuid NOT NULL)');
        await q.query('CREATE INDEX chat_events_conversation_sequence ON chat_events ("conversationKey", sequence)');
        await q.query('CREATE INDEX chat_attachments_expiry ON chat_attachments ("expiresAt") WHERE "messageId" IS NULL');
    }
    async down(q) {
        await q.query('DROP TABLE chat_events');
        await q.query('DROP TABLE chat_attachments');
        for (const table of ["direct_messages", "channel_messages", "task_comments", "project_messages"]) {
            await q.query(`ALTER TABLE "${table}" DROP COLUMN "chatVersion", DROP COLUMN "replyToMessageId", DROP COLUMN "pinnedAt", DROP COLUMN "pinnedById", DROP COLUMN "chatUpdatedAt"`);
        }
        await q.query('ALTER TABLE channels DROP COLUMN "allowedFileTypes"');
    }
}
exports.ChatMedia1794700001000 = ChatMedia1794700001000;
