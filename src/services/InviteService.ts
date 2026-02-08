import { AppDataSource } from "../config/data-source";
import { Invitation } from "../entities/Invitation";
import { UserRole } from "../entities/User";
import crypto from "crypto";

export class InviteService {
    private inviteRepo = AppDataSource.getRepository(Invitation);

    async createInvite(email: string, role: UserRole, projectId?: string, teamId?: string) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h limit

        const invite = this.inviteRepo.create({
            email,
            token,
            role,
            expiresAt,
            project: projectId ? { id: projectId } as any : null,
            team: teamId ? { id: teamId } as any : null
        });

        await this.inviteRepo.save(invite);

        // In a real app, you'd send an email here.
        return { inviteUrl: `http://localhost:3000/register?token=${token}&email=${email}`, token };
    }
}
