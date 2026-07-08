import crypto from "crypto";
import { ILike } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Team } from "../entities/Team";
import { Invitation } from "../entities/Invitation";
import { User, UserRole } from "../entities/User";
import { hashPassword } from "../utils/auth";
import { ActivityAction } from "../entities/ActivityLog";
import { ActivityLogService } from "./ActivityLogService";
import { CREATOR_CONTROLLED_PERMISSIONS, PermissionKey } from "../constants/access";
import { OrganizationPermission } from "../entities/OrganizationPermission";
import { PermissionService } from "./PermissionService";
import { Role } from "../entities/Role";
import { Organization } from "../entities/Organization";
import { OrgMemberRole, UserOrganization } from "../entities/UserOrganization";

export class OrganizationService {
    private teamRepo = AppDataSource.getRepository(Team);
    private userRepo = AppDataSource.getRepository(User);
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private permissionRepo = AppDataSource.getRepository(OrganizationPermission);
    private activityLogService = new ActivityLogService();
    private permissionService = new PermissionService();
    private roleRepo = AppDataSource.getRepository(Role);
    private organizationRepo = AppDataSource.getRepository(Organization);
    private userOrganizationRepo = AppDataSource.getRepository(UserOrganization);

    private async ensureTeamMember(actorId: string, teamId: string) {
        const actor = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!actor) throw new Error("Actor user not found");
        if (actor.team?.id !== teamId) throw new Error("You do not belong to this organization");
        return actor;
    }

    private async ensureMemberManager(actorId: string, teamId: string) {
        const actor = await this.ensureTeamMember(actorId, teamId);
        const canManageMembers = await this.permissionService.userHasPermission(actor, PermissionKey.MEMBER_MANAGE);
        if (!canManageMembers) throw new Error("You do not have permission to manage members");
        return actor;
    }

    private ensureCreatorCanAssignSensitivePermissions(actor: User, permissions: PermissionKey[]) {
        const includesSensitive = permissions.some((permission) => CREATOR_CONTROLLED_PERMISSIONS.has(permission));
        if (includesSensitive && actor.legacyRole !== UserRole.SUPER_ADMIN && actor.legacyRole !== UserRole.SUDO_ADMIN) {
            throw new Error("Only the organization creator can assign project and team visibility permissions");
        }
    }

    async createOrganization(actorId: string, name: string) {
        const actor = await this.userRepo.findOne({ where: { id: actorId } });
        if (!actor) throw new Error("User not found");

        const existing = await this.teamRepo.findOne({ where: { name } });
        if (existing) throw new Error("Organization with this name already exists");

        const team = this.teamRepo.create({ name });
        const savedTeam = await this.teamRepo.save(team);

        const orgSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `org-${savedTeam.id.slice(0, 8)}`;
        await this.organizationRepo.save(
            this.organizationRepo.create({
                id: savedTeam.id,
                name,
                slug: `${orgSlug}-${savedTeam.id.slice(0, 4)}`,
                ownerId: actor.id
            })
        );

        actor.team = savedTeam;
        actor.legacyRole = UserRole.SUPER_ADMIN;
        actor.organizationId = savedTeam.id;
        await this.userRepo.save(actor);

        const existingMembership = await this.userOrganizationRepo.findOne({
            where: { userId: actor.id, organizationId: savedTeam.id }
        });
        if (!existingMembership) {
            await this.userOrganizationRepo.save(
                this.userOrganizationRepo.create({
                    userId: actor.id,
                    organizationId: savedTeam.id,
                    role: OrgMemberRole.OWNER
                })
            );
        }

        await this.activityLogService.log({
            action: ActivityAction.ORGANIZATION_CREATED,
            actorId,
            teamId: savedTeam.id,
            details: `${actor.fullName} created organization ${savedTeam.name}`
        });

        return savedTeam;
    }

    async searchOrganizations(query?: string) {
        const where = query ? { name: ILike(`%${query}%`) } : {};
        const teams = await this.teamRepo.find({ where, relations: ["members"], order: { createdAt: "DESC" }, take: 30 });
        return teams.map((team) => ({ id: team.id, name: team.name, createdAt: team.createdAt, membersCount: team.members?.length ?? 0 }));
    }

    async joinOrganization(actorId: string, teamId: string) {
        const user = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!user) throw new Error("User not found");

        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) throw new Error("Organization not found");

        user.team = team;
        user.organizationId = team.id;
        if (user.legacyRole !== UserRole.SUPER_ADMIN && user.legacyRole !== UserRole.SUDO_ADMIN) {
            user.legacyRole = UserRole.MEMBER;
        }

        const savedUser = await this.userRepo.save(user);
        const existingMembership = await this.userOrganizationRepo.findOne({
            where: { userId: user.id, organizationId: team.id }
        });
        if (!existingMembership) {
            await this.userOrganizationRepo.save(
                this.userOrganizationRepo.create({
                    userId: user.id,
                    organizationId: team.id,
                    role: OrgMemberRole.MEMBER
                })
            );
        }
        await this.activityLogService.log({
            action: ActivityAction.MEMBER_JOINED,
            actorId,
            targetUserId: actorId,
            teamId,
            details: `${savedUser.fullName} joined ${team.name}`
        });

        return savedUser;
    }

    async inviteMember(actorId: string, teamId: string, email: string, role: UserRole) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const roleEntity = await this.roleRepo.findOne({ where: { name: role } as any });
        const invite = this.inviteRepo.create({
            email,
            token,
            organizationId: teamId,
            role: roleEntity ?? undefined,
            roleId: roleEntity?.id,
            expiresAt,
            status: "pending" as any,
            type: "organization" as any,
            invitedBy: { id: actor.id } as User
        });

        await this.inviteRepo.save(invite);
        await this.activityLogService.log({ action: ActivityAction.MEMBER_INVITED, actorId, teamId, details: `Invitation sent to ${email} with role ${role}` });

        return { token, inviteUrl: `http://localhost:3000/register?token=${token}&email=${encodeURIComponent(email)}`, emailSent: false };
    }

    async addMemberManually(actorId: string, teamId: string, name: string, email: string, role: UserRole) {
        await this.ensureMemberManager(actorId, teamId);
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) throw new Error("Organization not found");

        const existingUser = await this.userRepo.findOne({ where: { email }, relations: ["team"] });
        let savedUser: User;
        if (existingUser) {
            existingUser.fullName = name || existingUser.fullName;
            existingUser.legacyRole = role;
            existingUser.team = team;
            existingUser.organizationId = team.id;
            savedUser = await this.userRepo.save(existingUser);
        } else {
            const tempPassword = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await hashPassword(tempPassword);
            const createdUser = this.userRepo.create({ fullName: name, email, password: hashedPassword, legacyRole: role, team, organizationId: team.id });
            savedUser = await this.userRepo.save(createdUser);
        }

        const existingMembership = await this.userOrganizationRepo.findOne({
            where: { userId: savedUser.id, organizationId: team.id }
        });
        if (!existingMembership) {
            await this.userOrganizationRepo.save(
                this.userOrganizationRepo.create({
                    userId: savedUser.id,
                    organizationId: team.id,
                    role: role === UserRole.SUPER_ADMIN || role === UserRole.SUDO_ADMIN ? OrgMemberRole.ADMIN : OrgMemberRole.MEMBER
                })
            );
        }

        await this.activityLogService.log({ action: ActivityAction.MEMBER_ADDED, actorId, targetUserId: savedUser.id, teamId, details: `${savedUser.email} added manually with role ${role}` });
        return savedUser;
    }

    async updateMemberRole(actorId: string, teamId: string, memberId: string, role: UserRole) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) throw new Error("Member not found in organization");

        member.legacyRole = role;
        const saved = await this.userRepo.save(member);
        await this.activityLogService.log({ action: ActivityAction.MEMBER_ROLE_UPDATED, actorId, targetUserId: memberId, teamId, details: `${saved.email} role changed to ${role}` });
        return saved;
    }

    async removeMember(actorId: string, teamId: string, memberId: string) {
        await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) throw new Error("Member not found in organization");

        member.team = undefined;
        member.organizationId = undefined;
        if (member.legacyRole !== UserRole.SUDO_ADMIN) member.legacyRole = UserRole.MEMBER;
        const saved = await this.userRepo.save(member);

        await this.userOrganizationRepo.delete({ userId: memberId, organizationId: teamId });

        await this.activityLogService.log({ action: ActivityAction.MEMBER_REMOVED, actorId, targetUserId: memberId, teamId, details: `${saved.email} removed from organization` });
        return { id: saved.id, email: saved.email };
    }

    async getMembers(teamId: string) {
        const team = await this.teamRepo.findOne({ where: { id: teamId }, relations: ["members"] });
        if (!team) throw new Error("Organization not found");
        return team.members;
    }

    async getActivity(teamId: string, limit = 50) {
        await this.teamRepo.findOneOrFail({ where: { id: teamId } });
        return this.activityLogService.getTeamActivity(teamId, limit);
    }

    async getMemberPermissions(actorId: string, teamId: string, memberId: string) {
        await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) throw new Error("Member not found in organization");

        const explicit = await this.permissionRepo.find({ where: { team: { id: teamId } as any, user: { id: memberId } as any } });
        const effective = await this.permissionService.getEffectivePermissions(member);

        return { memberId, explicitPermissions: explicit.map((entry) => entry.permission), effectivePermissions: Array.from(effective) };
    }

    async setMemberPermissions(actorId: string, teamId: string, memberId: string, permissions: PermissionKey[]) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        this.ensureCreatorCanAssignSensitivePermissions(actor, permissions);

        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) throw new Error("Member not found in organization");

        if (member.id === actor.id && permissions.includes(PermissionKey.MEMBER_MANAGE) === false) {
            throw new Error("You cannot revoke your own member management permission");
        }

        const deduped = Array.from(new Set(permissions));
        const validPermissions = deduped.filter((permission) => Object.values(PermissionKey).includes(permission));

        await this.permissionRepo.delete({ team: { id: teamId } as any, user: { id: memberId } as any });
        if (validPermissions.length > 0) {
            const rows = validPermissions.map((permission) => this.permissionRepo.create({ team: { id: teamId } as Team, user: { id: memberId } as User, grantedBy: { id: actor.id } as User, permission }));
            await this.permissionRepo.save(rows);
        }

        await this.activityLogService.log({ action: ActivityAction.MEMBER_ROLE_UPDATED, actorId, targetUserId: memberId, teamId, details: `Updated member permissions: ${validPermissions.join(", ") || "none"}` });
        return this.getMemberPermissions(actorId, teamId, memberId);
    }
}

export const organizationService = new OrganizationService();