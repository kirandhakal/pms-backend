"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteService = void 0;
const data_source_1 = require("../config/data-source");
const Invitation_1 = require("../entities/Invitation");
const crypto_1 = __importDefault(require("crypto"));
class InviteService {
    constructor() {
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
    }
    async createInvite(email, role, projectId) {
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h limit
        const invite = this.inviteRepo.create({
            email,
            token,
            role,
            expiresAt,
            project: projectId ? { id: projectId } : null
        });
        await this.inviteRepo.save(invite);
        // In a real app, you'd send an email here.
        return { inviteUrl: `http://localhost:3000/register?token=${token}&email=${email}`, token };
    }
}
exports.InviteService = InviteService;
