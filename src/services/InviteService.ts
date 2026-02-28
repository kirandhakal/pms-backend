import { AppDataSource } from "../config/data-source";
import { Invitation, InvitationStatus, InvitationType } from "../entities/Invitation";
import { User, UserRole } from "../entities/User";
import { Organization } from "../entities/Organization";
import { Role } from "../entities/Role";
import { sendInvitationEmail } from "../utils/mailer";
import crypto from "crypto";
import { Not, In } from "typeorm";

export class InviteService {
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private userRepo = AppDataSource.getRepository(User);
    private orgRepo = AppDataSource.getRepository(Organization);
    private roleRepo = AppDataSource.getRepository(Role);

    /**
     * Create an invitation, persist it & send the email.
     */
    async createInvite(
        email: string, 
        legacyRole: UserRole,
        options: {
            organizationId?: string;
            departmentId?: string;
            roleId?: string;
            invitedById?: string;
            message?: string;
        } = {}
    ) {
        // Prevent inviting an already-registered user
        const existingUser = await this.userRepo.findOne({ where: { email } });
        if (existingUser) {
            throw new Error("A user with this email already exists.");
        }

        // Prevent duplicate pending invites
        const existingInvite = await this.inviteRepo.findOne({
            where: { 
                email, 
                status: InvitationStatus.PENDING 
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
            } else {
                throw new Error("No organization found. Please create an organization first.");
            }
        }

        const token = crypto.randomBytes(32).toString("hex");
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
            status: InvitationStatus.PENDING,
            type: options.departmentId ? InvitationType.DEPARTMENT : InvitationType.ORGANIZATION,
        });

        await this.inviteRepo.save(invite);

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const inviteUrl = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

        // Send the invitation email
        try {
            await sendInvitationEmail(email, inviteUrl, legacyRole, expiresAt);
        } catch (emailErr: any) {
            console.error("⚠️  Failed to send invitation email:", emailErr.message);
            // Still return the invite URL even if email fails
        }

        return { inviteUrl, token };
    }

    /**
     * Validate an invitation token (used during registration).
     */
    async validateToken(token: string) {
        const invite = await this.inviteRepo.findOne({
            where: { 
                token, 
                status: InvitationStatus.PENDING 
            },
            relations: ["organization", "department", "role"]
        });

        if (!invite) {
            throw new Error("Invalid or already-used invitation token.");
        }

        if (invite.expiresAt < new Date()) {
            // Mark as expired
            invite.status = InvitationStatus.EXPIRED;
            await this.inviteRepo.save(invite);
            throw new Error("This invitation has expired.");
        }

        return invite;
    }

    /**
     * Mark an invitation as used (call after successful registration).
     */
    async markUsed(token: string, acceptedByUserId?: string) {
        const invite = await this.validateToken(token);
        invite.status = InvitationStatus.ACCEPTED;
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
    async revokeInvite(token: string) {
        const invite = await this.inviteRepo.findOne({ where: { token } });
        if (!invite) {
            throw new Error("Invitation not found.");
        }
        invite.status = InvitationStatus.REVOKED;
        await this.inviteRepo.save(invite);
        return invite;
    }

    /**
     * Resend an invitation
     */
    async resendInvite(token: string) {
        const invite = await this.inviteRepo.findOne({ 
            where: { token },
            relations: ["role"]
        });
        
        if (!invite) {
            throw new Error("Invitation not found.");
        }

        if (invite.status !== InvitationStatus.PENDING) {
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
        const legacyRole = UserRole.MEMBER;

        try {
            await sendInvitationEmail(invite.email, inviteUrl, legacyRole, invite.expiresAt);
        } catch (emailErr: any) {
            console.error("⚠️  Failed to send invitation email:", emailErr.message);
        }

        return { inviteUrl, token };
    }

    /**
     * List all invitations (for admin panel).
     */
    async listInvites(filters?: { 
        organizationId?: string; 
        status?: InvitationStatus;
        departmentId?: string; 
    }) {
        const where: any = {};
        if (filters?.organizationId) where.organizationId = filters.organizationId;
        if (filters?.status) where.status = filters.status;
        if (filters?.departmentId) where.departmentId = filters.departmentId;

        return this.inviteRepo.find({
            where,
            order: { createdAt: "DESC" },
            relations: ["organization", "department", "role", "invitedBy"],
        });
    }

    /**
     * Get invitation by ID
     */
    async getInviteById(id: string) {
        return this.inviteRepo.findOne({
            where: { id },
            relations: ["organization", "department", "role", "invitedBy"]
        });
    }
}
