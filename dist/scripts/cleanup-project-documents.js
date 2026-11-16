"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const ProjectAssets_1 = require("../entities/ProjectAssets");
const ChatStorageService_1 = require("../services/ChatStorageService");
async function main() {
    data_source_1.AppDataSource.setOptions({ synchronize: false });
    await data_source_1.AppDataSource.initialize();
    try {
        const pending = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).createQueryBuilder('d').addSelect('d.storageKey').where('d.status != :ready AND d.createdAt < :expiry', { ready: 'ready', expiry: new Date(Date.now() - 86400000) }).getMany();
        for (const d of pending) {
            await ChatStorageService_1.chatStorageService.remove(d.storageKey);
            await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).delete({ id: d.id, status: (0, typeorm_1.Not)('ready') });
        }
        console.log(`Cleaned ${pending.length} expired document uploads`);
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
