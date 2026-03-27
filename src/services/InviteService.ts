import { AppDataSource } from "../config/data-source";
import { Invitation } from "../entities/Invitation";
import { UserRole } from "../entities/User";
import crypto from "crypto";
import { Team } from "../entities/Team";
import { EmailService } from "./EmailService";

export class InviteService {
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private emailService = new EmailService();

    async createInvite(email: string, role: UserRole, teamId?: string) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h limit

        const invite = this.inviteRepo.create({
            email,
            token,
            role,
            expiresAt,
            team: teamId ? ({ id: teamId } as Team) : undefined
        });

        await this.inviteRepo.save(invite);

        const emailResult = await this.emailService.sendInvitation({
            email,
            token,
            organizationName: "Organization",
            inviterName: "Team Admin",
            role
        });

        return { inviteUrl: emailResult.inviteUrl, token };
    }
}
