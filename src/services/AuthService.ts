import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { Session } from "../entities/Session";
import { Invitation } from "../entities/Invitation";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { MoreThan } from "typeorm";
import { ActivityAction } from "../entities/ActivityLog";
import { ActivityLogService } from "./ActivityLogService";

export class AuthService {
    private userRepo = AppDataSource.getRepository(User);
    private sessionRepo = AppDataSource.getRepository(Session);
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private activityLogService = new ActivityLogService();

    async registerIndividual(data: { email: string; password: string; name: string }) {
        const { email, password, name } = data;

        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            throw new Error("Email already registered");
        }

        const hashedPassword = await hashPassword(password);
        const user = this.userRepo.create({
            email,
            name,
            password: hashedPassword,
            role: UserRole.TEAM_MEMBER
        });

        return this.userRepo.save(user);
    }

    async registerWithInvite(data: any) {
        return await AppDataSource.transaction(async (manager) => {
            const { email, password, name, token } = data;

            const existing = await manager.findOne(User, { where: { email } });
            if (existing) {
                throw new Error("Email already registered");
            }

            const invitation = await manager.findOne(Invitation, {
                where: { email, token, isUsed: false, expiresAt: MoreThan(new Date()) },
                relations: ["team"]
            });

            if (!invitation) {
                throw new Error("Invalid or expired invitation");
            }

            const hashedPassword = await hashPassword(password);
            const user = manager.create(User, {
                email,
                name,
                password: hashedPassword,
                role: invitation.role,
                team: invitation.team
            });

            const savedUser = await manager.save(user);

            invitation.isUsed = true;
            await manager.save(invitation);

            if (invitation.team?.id) {
                await this.activityLogService.log({
                    action: ActivityAction.MEMBER_JOINED,
                    actorId: savedUser.id,
                    targetUserId: savedUser.id,
                    teamId: invitation.team.id,
                    details: `${savedUser.email} joined via invite`
                });
            }

            return savedUser;
        });
    }

    async login(email: string, password: string) {
        const user = await this.userRepo.findOne({
            where: { email },
            select: ["id", "password", "role", "name"]
        });

        if (!user || !(await comparePassword(password, user.password))) {
            throw new Error("Invalid credentials");
        }

        const token = generateToken({ id: user.id, role: user.role });

        const session = this.sessionRepo.create({
            user,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        });

        await this.sessionRepo.save(session);

        return { token, user: { id: user.id, name: user.name, role: user.role } };
    }

    async logout(token: string) {
        const session = await this.sessionRepo.findOne({ where: { token } });
        if (session) {
            session.isActive = false;
            await this.sessionRepo.save(session);
        }
    }

    async getCurrentUser(userId: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ["team"]
        });

        if (!user) {
            throw new Error("User not found");
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            team: user.team ? { id: user.team.id, name: user.team.name } : null
        };
    }

    // SuperAdmin initial setup (Internal or via first user logic)
    async createSuperAdmin(data: any) {
        const hashedPassword = await hashPassword(data.password);
        const user = this.userRepo.create({ ...data, password: hashedPassword, role: UserRole.SUPER_ADMIN });
        return await this.userRepo.save(user);
    }
}
