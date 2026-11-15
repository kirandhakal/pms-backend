"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../config/data-source");
const ChatAttachmentService_1 = require("../services/ChatAttachmentService");
async function main() {
    await data_source_1.AppDataSource.initialize();
    try {
        console.log(`Removed ${await (0, ChatAttachmentService_1.cleanupChatAttachments)()} expired chat attachments`);
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
main().catch(() => { console.error("Chat attachment cleanup failed; check database and storage configuration"); process.exitCode = 1; });
