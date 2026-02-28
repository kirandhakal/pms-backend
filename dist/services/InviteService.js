"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteService = void 0;
const data_source_1 = require("../config/data-source");
const Invitation_1 = require("../entities/Invitation");
const User_1 = require("../entities/User");
const Organization_1 = require("../entities/Organization");
const Role_1 = require("../entities/Role");
const mailer_1 = require("../utils/mailer");
const crypto_1 = __importDefault(require("crypto"));
class InviteService {
    constructor() {
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.orgRepo = data_source_1.AppDataSource.getRepository(Organization_1.Organization);
        this.roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
    }
    /**
     * Create an invitation, persist it & send the email.
     */
    async createInvite(email, legacyRole, options = {}) {
        // Prevent inviting an already-registered user
        const existingUser = await this.userRepo.findOne({ where: { email } });
        if (existingUser) {
            throw new Error("A user with this email already exists.");
        }
        // Prevent duplicate pending invites
        const existingInvite = await this.inviteRepo.findOne({
            where: {
                email,
                status: Invitation_1.InvitationStatus.PENDING
            },
        });
        if (existingInvite && existingInvite.expiresAt > new Date()) {
            throw new Error("A pending invitation already exists for this email.");
        }
        // Get or create default organization if not provided
        let organizationId = options.organizationId;
        if (!organizationId) {
            // Try to get the first organization
            const defaultOrg = await this.orgRepo.findOne({ where: { isActive: true } });
            if (defaultOrg) {
                organizationId = defaultOrg.id;
            }
            else {
                throw new Error("No organization found. Please create an organization first.");
            }
        }
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48-hour window
        const invite = this.inviteRepo.create({
            email,
            token,
            organizationId,
            departmentId: options.departmentId,
            roleId: options.roleId,
            invitedById: options.invitedById,
            message: options.message,
            expiresAt,
            status: Invitation_1.InvitationStatus.PENDING,
            type: options.departmentId ? Invitation_1.InvitationType.DEPARTMENT : Invitation_1.InvitationType.ORGANIZATION,
        });
        await this.inviteRepo.save(invite);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const inviteUrl = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;
        // Send the invitation email
        try {
            await (0, mailer_1.sendInvitationEmail)(email, inviteUrl, legacyRole, expiresAt);
        }
        catch (emailErr) {
            console.error("⚠️  Failed to send invitation email:", emailErr.message);
            // Still return the invite URL even if email fails
        }
        return { inviteUrl, token };
    }
    /**
     * Validate an invitation token (used during registration).
     */
    async validateToken(token) {
        const invite = await this.inviteRepo.findOne({
            where: {
                token,
                status: Invitation_1.InvitationStatus.PENDING
            },
            relations: ["organization", "department", "role"]
        });
        if (!invite) {
            throw new Error("Invalid or already-used invitation token.");
        }
        if (invite.expiresAt < new Date()) {
            // Mark as expired
            invite.status = Invitation_1.InvitationStatus.EXPIRED;
            await this.inviteRepo.save(invite);
            throw new Error("This invitation has expired.");
        }
        return invite;
    }
    /**
     * Mark an invitation as used (call after successful registration).
     */
    async markUsed(token, acceptedByUserId) {
        const invite = await this.validateToken(token);
        invite.status = Invitation_1.InvitationStatus.ACCEPTED;
        invite.metadata = {
            ...invite.metadata,
            acceptedAt: new Date(),
            acceptedByUserId
        };
        await this.inviteRepo.save(invite);
        return invite;
    }
    /**
     * Revoke an invitation
     */
    async revokeInvite(token) {
        const invite = await this.inviteRepo.findOne({ where: { token } });
        if (!invite) {
            throw new Error("Invitation not found.");
        }
        invite.status = Invitation_1.InvitationStatus.REVOKED;
        await this.inviteRepo.save(invite);
        return invite;
    }
    /**
     * Resend an invitation
     */
    async resendInvite(token) {
        const invite = await this.inviteRepo.findOne({
            where: { token },
            relations: ["role"]
        });
        if (!invite) {
            throw new Error("Invitation not found.");
        }
        if (invite.status !== Invitation_1.InvitationStatus.PENDING) {
            throw new Error("Can only resend pending invitations.");
        }
        // Extend expiry
        invite.expiresAt = new Date();
        invite.expiresAt.setHours(invite.expiresAt.getHours() + 48);
        invite.metadata = {
            ...invite.metadata,
            resendCount: (invite.metadata?.resendCount || 0) + 1,
            lastResentAt: new Date()
        };
        await this.inviteRepo.save(invite);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const inviteUrl = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(invite.email)}`;
        // Get legacy role from Role entity or default
        const legacyRole = User_1.UserRole.MEMBER;
        try {
            await (0, mailer_1.sendInvitationEmail)(invite.email, inviteUrl, legacyRole, invite.expiresAt);
        }
        catch (emailErr) {
            console.error("⚠️  Failed to send invitation email:", emailErr.message);
        }
        return { inviteUrl, token };
    }
    /**
     * List all invitations (for admin panel).
     */
    async listInvites(filters) {
        const where = {};
        if (filters?.organizationId)
            where.organizationId = filters.organizationId;
        if (filters?.status)
            where.status = filters.status;
        if (filters?.departmentId)
            where.departmentId = filters.departmentId;
        return this.inviteRepo.find({
            where,
            order: { createdAt: "DESC" },
            relations: ["organization", "department", "role", "invitedBy"],
        });
    }
    /**
     * Get invitation by ID
     */
    async getInviteById(id) {
        return this.inviteRepo.findOne({
            where: { id },
            relations: ["organization", "department", "role", "invitedBy"]
        });
    }
}
exports.InviteService = InviteService;
