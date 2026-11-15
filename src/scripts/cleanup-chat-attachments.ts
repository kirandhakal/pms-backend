import { AppDataSource } from "../config/data-source";
import { cleanupChatAttachments } from "../services/ChatAttachmentService";

async function main() {
    await AppDataSource.initialize();
    try { console.log(`Removed ${await cleanupChatAttachments()} expired chat attachments`); }
    finally { await AppDataSource.destroy(); }
}
main().catch(() => { console.error("Chat attachment cleanup failed; check database and storage configuration"); process.exitCode = 1; });
