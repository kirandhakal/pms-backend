import crypto from "crypto";
import { ILike } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Team } from "../entities/Team";
import { Invitation } from "../entities/Invitation";
import { OAuthProvider, User, UserRole } from "../entities/User";
import { hashPassword } from "../utils/auth";
import { ActivityAction } from "../entities/ActivityLog";
import { ActivityLogService } from "./ActivityLogService";
import { CREATOR_CONTROLLED_PERMISSIONS, PermissionKey, normalizeRole } from "../constants/access";
import { OrganizationPermission } from "../entities/OrganizationPermission";
import { PermissionService } from "./PermissionService";
import { EmailService } from "./EmailService";

export class OrganizationService {
    private teamRepo = AppDataSource.getRepository(Team);
    private userRepo = AppDataSource.getRepository(User);
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private permissionRepo = AppDataSource.getRepository(OrganizationPermission);
    private activityLogService = new ActivityLogService();
    private permissionService = new PermissionService();
    private emailService = new EmailService();

    private async ensureTeamMember(actorId: string, teamId: string) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team", "team.createdBy"]
        });

        if (!actor) {
            throw new Error("Actor user not found");
        }

        if (actor.team?.id !== teamId) {
            throw new Error("You do not belong to this organization");
        }

        return actor;
    }

    private async ensureMemberManager(actorId: string, teamId: string) {
        const actor = await this.ensureTeamMember(actorId, teamId);
        const canManageMembers = await this.permissionService.userHasPermission(actor, PermissionKey.MEMBER_MANAGE);
        if (!canManageMembers) {
            throw new Error("You do not have permission to manage members");
        }

        return actor;
    }

    private ensureCreatorCanAssignSensitivePermissions(actor: User, permissions: PermissionKey[]) {
        const isCreator = actor.team?.createdBy?.id === actor.id;
        const includesSensitive = permissions.some((permission) => CREATOR_CONTROLLED_PERMISSIONS.has(permission));

        if (includesSensitive && !isCreator) {
            throw new Error("Only the organization creator can assign project and team visibility permissions");
        }
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

        const team = this.teamRepo.create({ name, createdBy: actor });
        const savedTeam = await this.teamRepo.save(team);

        actor.team = savedTeam;
        actor.role = UserRole.SUPER_ADMIN;
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
        if (normalizeRole(user.role) !== UserRole.SUPER_ADMIN && normalizeRole(user.role) !== UserRole.SUDO_ADMIN) {
            user.role = UserRole.MEMBER;
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
        const actor = await this.ensureMemberManager(actorId, teamId);

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const invite = this.inviteRepo.create({
            email,
            token,
            role: normalizeRole(role),
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

        const emailResult = await this.emailService.sendInvitation({
            email,
            token,
            organizationName: actor.team?.name || "Organization",
            inviterName: actor.name,
            role: normalizeRole(role)
        });

        return {
            token,
            inviteUrl: emailResult.inviteUrl
        };
    }

    async addMemberManually(actorId: string, teamId: string, name: string, email: string, role: UserRole) {
        await this.ensureMemberManager(actorId, teamId);

        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new Error("Organization not found");
        }

        const existingUser = await this.userRepo.findOne({ where: { email }, relations: ["team"] });

        let savedUser: User;
        if (existingUser) {
            existingUser.name = name || existingUser.name;
            existingUser.role = normalizeRole(role);
            existingUser.team = team;
            savedUser = await this.userRepo.save(existingUser);
        } else {
            const tempPassword = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await hashPassword(tempPassword);

            const createdUser = this.userRepo.create({
                name,
                email,
                password: hashedPassword,
                role: normalizeRole(role),
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
        const actor = await this.ensureMemberManager(actorId, teamId);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }

        const normalizedRole = normalizeRole(role);
        if (normalizedRole === UserRole.SUPER_ADMIN && actor.team?.createdBy?.id !== actor.id) {
            throw new Error("Only the organization creator can assign Super Admin role");
        }

        member.role = normalizedRole;
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
        const actor = await this.ensureMemberManager(actorId, teamId);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }

        if (member.id === actor.team?.createdBy?.id) {
            throw new Error("Organization creator cannot be removed");
        }

        member.team = undefined;
        if (normalizeRole(member.role) !== UserRole.SUDO_ADMIN) {
            member.role = UserRole.MEMBER;
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

    async getMembers(actorId: string, teamId: string) {
        await this.ensureTeamMember(actorId, teamId);

        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ["members"]
        });

        if (!team) {
            throw new Error("Organization not found");
        }

        return team.members;
    }

    async getActivity(actorId: string, teamId: string, limit = 50) {
        const actor = await this.ensureTeamMember(actorId, teamId);
        const canView = await this.permissionService.userHasPermission(actor, PermissionKey.VIEW_TEAM_ACTIVITY);
        if (!canView) {
            throw new Error("You do not have permission to view team activity");
        }

        await this.teamRepo.findOneOrFail({ where: { id: teamId } });
        return this.activityLogService.getTeamActivity(teamId, limit);
    }

    async getMemberPermissions(actorId: string, teamId: string, memberId: string) {
        await this.ensureMemberManager(actorId, teamId);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }

        const explicit = await this.permissionRepo.find({
            where: {
                team: { id: teamId },
                user: { id: memberId }
            }
        });

        const effective = await this.permissionService.getEffectivePermissions(member);

        return {
            memberId,
            explicitPermissions: explicit.map((entry) => entry.permission),
            effectivePermissions: Array.from(effective)
        };
    }

    async setMemberPermissions(actorId: string, teamId: string, memberId: string, permissions: PermissionKey[]) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        this.ensureCreatorCanAssignSensitivePermissions(actor, permissions);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }

        if (member.id === actor.id && permissions.includes(PermissionKey.MEMBER_MANAGE) === false) {
            throw new Error("You cannot revoke your own member management permission");
        }

        const deduped = Array.from(new Set(permissions));
        const validPermissions = deduped.filter((permission) => Object.values(PermissionKey).includes(permission));

        await this.permissionRepo.delete({
            team: { id: teamId },
            user: { id: memberId }
        });

        if (validPermissions.length > 0) {
            const rows = validPermissions.map((permission) =>
                this.permissionRepo.create({
                    team: { id: teamId } as Team,
                    user: { id: memberId } as User,
                    grantedBy: { id: actor.id } as User,
                    permission
                })
            );
            await this.permissionRepo.save(rows);
        }

        await this.activityLogService.log({
            action: ActivityAction.MEMBER_ROLE_UPDATED,
            actorId,
            targetUserId: memberId,
            teamId,
            details: `Updated member permissions: ${validPermissions.join(", ") || "none"}`
        });

        return this.getMemberPermissions(actorId, teamId, memberId);
    }
}
