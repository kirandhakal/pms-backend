"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteService = void 0;
const data_source_1 = require("../config/data-source");
const Invitation_1 = require("../entities/Invitation");
const crypto_1 = __importDefault(require("crypto"));
const EmailService_1 = require("./EmailService");
class InviteService {
    constructor() {
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
        this.emailService = new EmailService_1.EmailService();
    }
    async createInvite(email, role, teamId) {
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h limit
        const invite = this.inviteRepo.create({
            email,
            token,
            role,
            expiresAt,
            team: teamId ? { id: teamId } : undefined
        });
        await this.inviteRepo.save(invite);
        const emailResult = await this.emailService.sendInvitation({
            email,
            token,
            organizationName: "Organization",
            inviterName: "Team Admin",
            role
        });
        return {
            inviteUrl: emailResult.inviteUrl,
            token,
            emailSent: emailResult.sent,
            emailError: emailResult.error
        };
    }
}
exports.InviteService = InviteService;
