import { AppDataSource } from "../config/data-source";
import { Invitation } from "../entities/Invitation";
import { User, UserRole } from "../entities/User";
import { sendInvitationEmail } from "../utils/mailer";
import crypto from "crypto";

export class InviteService {
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private userRepo = AppDataSource.getRepository(User);

    /**
     * Create an invitation, persist it & send the email.
     */
    async createInvite(email: string, role: UserRole, projectId?: string) {
        // Prevent inviting an already-registered user
        const existingUser = await this.userRepo.findOne({ where: { email } });
        if (existingUser) {
            throw new Error("A user with this email already exists.");
        }

        // Prevent duplicate pending invites
        const existingInvite = await this.inviteRepo.findOne({
            where: { email, isUsed: false },
        });
        if (existingInvite && existingInvite.expiresAt > new Date()) {
            throw new Error("A pending invitation already exists for this email.");
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48-hour window

        const invite = this.inviteRepo.create({
            email,
            token,
            role,
            expiresAt,
            project: projectId ? ({ id: projectId } as any) : null,
        });

        await this.inviteRepo.save(invite);

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const inviteUrl = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

        // Send the invitation email
        try {
            await sendInvitationEmail(email, inviteUrl, role, expiresAt);
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
            where: { token, isUsed: false },
        });

        if (!invite) {
            throw new Error("Invalid or already-used invitation token.");
        }

        if (invite.expiresAt < new Date()) {
            throw new Error("This invitation has expired.");
        }

        return invite;
    }

    /**
     * Mark an invitation as used (call after successful registration).
     */
    async markUsed(token: string) {
        const invite = await this.validateToken(token);
        invite.isUsed = true;
        await this.inviteRepo.save(invite);
        return invite;
    }

    /**
     * List all invitations (for admin panel).
     */
    async listInvites() {
        return this.inviteRepo.find({
            order: { createdAt: "DESC" },
            relations: ["project"],
        });
    }
}
