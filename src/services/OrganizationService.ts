import crypto from "crypto";
import { ILike } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Team } from "../entities/Team";
import { Invitation } from "../entities/Invitation";
import { OAuthProvider, User, UserRole } from "../entities/User";
import { hashPassword } from "../utils/auth";
import { ActivityAction } from "../entities/ActivityLog";
import { ActivityLogService } from "./ActivityLogService";

export class OrganizationService {
    private teamRepo = AppDataSource.getRepository(Team);
    private userRepo = AppDataSource.getRepository(User);
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private activityLogService = new ActivityLogService();

    private async ensureOrgAdmin(actorId: string, teamId: string) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team"]
        });

        if (!actor) {
            throw new Error("Actor user not found");
        }

        const sameTeam = actor.team?.id === teamId;
        const canManage = actor.role === UserRole.SUPER_ADMIN || (sameTeam && actor.role === UserRole.PROJECT_MANAGER);

        if (!canManage) {
            throw new Error("You do not have permission to manage this organization");
        }

        return actor;
    }

    async createOrganization(actorId: string, name: string) {
        const actor = await this.userRepo.findOne({ where: { id: actorId } });
        if (!actor) {
            throw new Error("User not found");
        }

        const existing = await this.teamRepo.findOne({ where: { name } });
        if (existing) {
            throw new Error("Organization with this name already exists");
        }

        const team = this.teamRepo.create({ name });
        const savedTeam = await this.teamRepo.save(team);

        actor.team = savedTeam;
        if (actor.role !== UserRole.SUPER_ADMIN) {
            actor.role = UserRole.PROJECT_MANAGER;
        }
        await this.userRepo.save(actor);

        await this.activityLogService.log({
            action: ActivityAction.ORGANIZATION_CREATED,
            actorId,
            teamId: savedTeam.id,
            details: `${actor.name} created organization ${savedTeam.name}`
        });

        return savedTeam;
    }

    async searchOrganizations(query?: string) {
        const where = query ? { name: ILike(`%${query}%`) } : {};
        const teams = await this.teamRepo.find({
            where,
            relations: ["members"],
            order: { createdAt: "DESC" },
            take: 30
        });

        return teams.map((team) => ({
            id: team.id,
            name: team.name,
            createdAt: team.createdAt,
            membersCount: team.members?.length ?? 0
        }));
    }

    async joinOrganization(actorId: string, teamId: string) {
        const user = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!user) {
            throw new Error("User not found");
        }

        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new Error("Organization not found");
        }

        user.team = team;
        if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.PROJECT_MANAGER) {
            user.role = UserRole.TEAM_MEMBER;
        }

        const savedUser = await this.userRepo.save(user);

        await this.activityLogService.log({
            action: ActivityAction.MEMBER_JOINED,
            actorId,
            targetUserId: actorId,
            teamId,
            details: `${savedUser.name} joined ${team.name}`
        });

        return savedUser;
    }

    async inviteMember(actorId: string, teamId: string, email: string, role: UserRole) {
        await this.ensureOrgAdmin(actorId, teamId);

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const invite = this.inviteRepo.create({
            email,
            token,
            role,
            team: { id: teamId } as Team,
            expiresAt,
            isUsed: false
        });

        await this.inviteRepo.save(invite);

        await this.activityLogService.log({
            action: ActivityAction.MEMBER_INVITED,
            actorId,
            teamId,
            details: `Invitation sent to ${email} with role ${role}`
        });

        return {
            token,
            inviteUrl: `http://localhost:3000/register?token=${token}&email=${encodeURIComponent(email)}`
        };
    }

    async addMemberManually(actorId: string, teamId: string, name: string, email: string, role: UserRole) {
        await this.ensureOrgAdmin(actorId, teamId);

        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new Error("Organization not found");
        }

        const existingUser = await this.userRepo.findOne({ where: { email }, relations: ["team"] });

        let savedUser: User;
        if (existingUser) {
            existingUser.name = name || existingUser.name;
            existingUser.role = role;
            existingUser.team = team;
            savedUser = await this.userRepo.save(existingUser);
        } else {
            const tempPassword = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await hashPassword(tempPassword);

            const createdUser = this.userRepo.create({
                name,
                email,
                password: hashedPassword,
                role,
                oauthProvider: OAuthProvider.LOCAL,
                team
            });

            savedUser = await this.userRepo.save(createdUser);
        }

        await this.activityLogService.log({
            action: ActivityAction.MEMBER_ADDED,
            actorId,
            targetUserId: savedUser.id,
            teamId,
            details: `${savedUser.email} added manually with role ${role}`
        });

        return savedUser;
    }

    async updateMemberRole(actorId: string, teamId: string, memberId: string, role: UserRole) {
        await this.ensureOrgAdmin(actorId, teamId);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }

        member.role = role;
        const saved = await this.userRepo.save(member);

        await this.activityLogService.log({
            action: ActivityAction.MEMBER_ROLE_UPDATED,
            actorId,
            targetUserId: memberId,
            teamId,
            details: `${saved.email} role changed to ${role}`
        });

        return saved;
    }

    async removeMember(actorId: string, teamId: string, memberId: string) {
        await this.ensureOrgAdmin(actorId, teamId);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }

        member.team = undefined;
        if (member.role !== UserRole.SUPER_ADMIN) {
            member.role = UserRole.TEAM_MEMBER;
        }

        const saved = await this.userRepo.save(member);

        await this.activityLogService.log({
            action: ActivityAction.MEMBER_REMOVED,
            actorId,
            targetUserId: memberId,
            teamId,
            details: `${saved.email} removed from organization`
        });

        return { id: saved.id, email: saved.email };
    }

    async getMembers(teamId: string) {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ["members"]
        });

        if (!team) {
            throw new Error("Organization not found");
        }

        return team.members;
    }

    async getActivity(teamId: string, limit = 50) {
        await this.teamRepo.findOneOrFail({ where: { id: teamId } });
        return this.activityLogService.getTeamActivity(teamId, limit);
    }
}
