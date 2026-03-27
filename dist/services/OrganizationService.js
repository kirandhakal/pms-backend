"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const Team_1 = require("../entities/Team");
const Invitation_1 = require("../entities/Invitation");
const User_1 = require("../entities/User");
const auth_1 = require("../utils/auth");
const ActivityLog_1 = require("../entities/ActivityLog");
const ActivityLogService_1 = require("./ActivityLogService");
const access_1 = require("../constants/access");
const OrganizationPermission_1 = require("../entities/OrganizationPermission");
const PermissionService_1 = require("./PermissionService");
const EmailService_1 = require("./EmailService");
class OrganizationService {
    constructor() {
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
        this.permissionRepo = data_source_1.AppDataSource.getRepository(OrganizationPermission_1.OrganizationPermission);
        this.activityLogService = new ActivityLogService_1.ActivityLogService();
        this.permissionService = new PermissionService_1.PermissionService();
        this.emailService = new EmailService_1.EmailService();
    }
    async ensureTeamMember(actorId, teamId) {
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
    async ensureMemberManager(actorId, teamId) {
        const actor = await this.ensureTeamMember(actorId, teamId);
        const canManageMembers = await this.permissionService.userHasPermission(actor, access_1.PermissionKey.MEMBER_MANAGE);
        if (!canManageMembers) {
            throw new Error("You do not have permission to manage members");
        }
        return actor;
    }
    ensureCreatorCanAssignSensitivePermissions(actor, permissions) {
        const isCreator = actor.team?.createdBy?.id === actor.id;
        const includesSensitive = permissions.some((permission) => access_1.CREATOR_CONTROLLED_PERMISSIONS.has(permission));
        if (includesSensitive && !isCreator) {
            throw new Error("Only the organization creator can assign project and team visibility permissions");
        }
    }
    async createOrganization(actorId, name) {
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
        actor.role = User_1.UserRole.SUPER_ADMIN;
        await this.userRepo.save(actor);
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.ORGANIZATION_CREATED,
            actorId,
            teamId: savedTeam.id,
            details: `${actor.name} created organization ${savedTeam.name}`
        });
        return savedTeam;
    }
    async searchOrganizations(query) {
        const where = query ? { name: (0, typeorm_1.ILike)(`%${query}%`) } : {};
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
    async joinOrganization(actorId, teamId) {
        const user = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!user) {
            throw new Error("User not found");
        }
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new Error("Organization not found");
        }
        user.team = team;
        if ((0, access_1.normalizeRole)(user.role) !== User_1.UserRole.SUPER_ADMIN && (0, access_1.normalizeRole)(user.role) !== User_1.UserRole.SUDO_ADMIN) {
            user.role = User_1.UserRole.MEMBER;
        }
        const savedUser = await this.userRepo.save(user);
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_JOINED,
            actorId,
            targetUserId: actorId,
            teamId,
            details: `${savedUser.name} joined ${team.name}`
        });
        return savedUser;
    }
    async inviteMember(actorId, teamId, email, role) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        const invite = this.inviteRepo.create({
            email,
            token,
            role: (0, access_1.normalizeRole)(role),
            team: { id: teamId },
            expiresAt,
            isUsed: false
        });
        await this.inviteRepo.save(invite);
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_INVITED,
            actorId,
            teamId,
            details: `Invitation sent to ${email} with role ${role}`
        });
        const emailResult = await this.emailService.sendInvitation({
            email,
            token,
            organizationName: actor.team?.name || "Organization",
            inviterName: actor.name,
            role: (0, access_1.normalizeRole)(role)
        });
        return {
            token,
            inviteUrl: emailResult.inviteUrl
        };
    }
    async addMemberManually(actorId, teamId, name, email, role) {
        await this.ensureMemberManager(actorId, teamId);
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new Error("Organization not found");
        }
        const existingUser = await this.userRepo.findOne({ where: { email }, relations: ["team"] });
        let savedUser;
        if (existingUser) {
            existingUser.name = name || existingUser.name;
            existingUser.role = (0, access_1.normalizeRole)(role);
            existingUser.team = team;
            savedUser = await this.userRepo.save(existingUser);
        }
        else {
            const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
            const hashedPassword = await (0, auth_1.hashPassword)(tempPassword);
            const createdUser = this.userRepo.create({
                name,
                email,
                password: hashedPassword,
                role: (0, access_1.normalizeRole)(role),
                oauthProvider: User_1.OAuthProvider.LOCAL,
                team
            });
            savedUser = await this.userRepo.save(createdUser);
        }
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_ADDED,
            actorId,
            targetUserId: savedUser.id,
            teamId,
            details: `${savedUser.email} added manually with role ${role}`
        });
        return savedUser;
    }
    async updateMemberRole(actorId, teamId, memberId, role) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }
        const normalizedRole = (0, access_1.normalizeRole)(role);
        if (normalizedRole === User_1.UserRole.SUPER_ADMIN && actor.team?.createdBy?.id !== actor.id) {
            throw new Error("Only the organization creator can assign Super Admin role");
        }
        member.role = normalizedRole;
        const saved = await this.userRepo.save(member);
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_ROLE_UPDATED,
            actorId,
            targetUserId: memberId,
            teamId,
            details: `${saved.email} role changed to ${role}`
        });
        return saved;
    }
    async removeMember(actorId, teamId, memberId) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }
        if (member.id === actor.team?.createdBy?.id) {
            throw new Error("Organization creator cannot be removed");
        }
        member.team = undefined;
        if ((0, access_1.normalizeRole)(member.role) !== User_1.UserRole.SUDO_ADMIN) {
            member.role = User_1.UserRole.MEMBER;
        }
        const saved = await this.userRepo.save(member);
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_REMOVED,
            actorId,
            targetUserId: memberId,
            teamId,
            details: `${saved.email} removed from organization`
        });
        return { id: saved.id, email: saved.email };
    }
    async getMembers(actorId, teamId) {
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
    async getActivity(actorId, teamId, limit = 50) {
        const actor = await this.ensureTeamMember(actorId, teamId);
        const canView = await this.permissionService.userHasPermission(actor, access_1.PermissionKey.VIEW_TEAM_ACTIVITY);
        if (!canView) {
            throw new Error("You do not have permission to view team activity");
        }
        await this.teamRepo.findOneOrFail({ where: { id: teamId } });
        return this.activityLogService.getTeamActivity(teamId, limit);
    }
    async getMemberPermissions(actorId, teamId, memberId) {
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
    async setMemberPermissions(actorId, teamId, memberId, permissions) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        this.ensureCreatorCanAssignSensitivePermissions(actor, permissions);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }
        if (member.id === actor.id && permissions.includes(access_1.PermissionKey.MEMBER_MANAGE) === false) {
            throw new Error("You cannot revoke your own member management permission");
        }
        const deduped = Array.from(new Set(permissions));
        const validPermissions = deduped.filter((permission) => Object.values(access_1.PermissionKey).includes(permission));
        await this.permissionRepo.delete({
            team: { id: teamId },
            user: { id: memberId }
        });
        if (validPermissions.length > 0) {
            const rows = validPermissions.map((permission) => this.permissionRepo.create({
                team: { id: teamId },
                user: { id: memberId },
                grantedBy: { id: actor.id },
                permission
            }));
            await this.permissionRepo.save(rows);
        }
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_ROLE_UPDATED,
            actorId,
            targetUserId: memberId,
            teamId,
            details: `Updated member permissions: ${validPermissions.join(", ") || "none"}`
        });
        return this.getMemberPermissions(actorId, teamId, memberId);
    }
}
exports.OrganizationService = OrganizationService;
