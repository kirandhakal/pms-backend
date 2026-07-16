"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationService = exports.OrganizationService = void 0;
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
const Role_1 = require("../entities/Role");
const Organization_1 = require("../entities/Organization");
const UserOrganization_1 = require("../entities/UserOrganization");
class OrganizationService {
    constructor() {
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
        this.permissionRepo = data_source_1.AppDataSource.getRepository(OrganizationPermission_1.OrganizationPermission);
        this.activityLogService = new ActivityLogService_1.ActivityLogService();
        this.permissionService = new PermissionService_1.PermissionService();
        this.roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        this.organizationRepo = data_source_1.AppDataSource.getRepository(Organization_1.Organization);
        this.userOrganizationRepo = data_source_1.AppDataSource.getRepository(UserOrganization_1.UserOrganization);
    }
    async ensureTeamMember(actorId, teamId) {
        const actor = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!actor)
            throw new Error("Actor user not found");
        if (actor.team?.id !== teamId)
            throw new Error("You do not belong to this organization");
        return actor;
    }
    async ensureMemberManager(actorId, teamId) {
        const actor = await this.ensureTeamMember(actorId, teamId);
        const canManageMembers = await this.permissionService.userHasPermission(actor, access_1.PermissionKey.MEMBER_MANAGE);
        if (!canManageMembers)
            throw new Error("You do not have permission to manage members");
        return actor;
    }
    ensureCreatorCanAssignSensitivePermissions(actor, permissions) {
        const includesSensitive = permissions.some((permission) => access_1.CREATOR_CONTROLLED_PERMISSIONS.has(permission));
        if (includesSensitive && actor.legacyRole !== User_1.UserRole.SUPER_ADMIN && actor.legacyRole !== User_1.UserRole.SUDO_ADMIN) {
            throw new Error("Only the organization creator can assign project and team visibility permissions");
        }
    }
    async createOrganization(actorId, name) {
        const actor = await this.userRepo.findOne({ where: { id: actorId } });
        if (!actor)
            throw new Error("User not found");
        const existing = await this.teamRepo.findOne({ where: { name } });
        if (existing)
            throw new Error("Organization with this name already exists");
        const team = this.teamRepo.create({ name, createdById: actorId });
        const savedTeam = await this.teamRepo.save(team);
        const orgSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `org-${savedTeam.id.slice(0, 8)}`;
        await this.organizationRepo.save(this.organizationRepo.create({
            id: savedTeam.id,
            name,
            slug: `${orgSlug}-${savedTeam.id.slice(0, 4)}`,
            ownerId: actor.id
        }));
        actor.team = savedTeam;
        actor.legacyRole = User_1.UserRole.SUPER_ADMIN;
        actor.organizationId = savedTeam.id;
        await this.userRepo.save(actor);
        const existingMembership = await this.userOrganizationRepo.findOne({
            where: { userId: actor.id, organizationId: savedTeam.id }
        });
        if (!existingMembership) {
            await this.userOrganizationRepo.save(this.userOrganizationRepo.create({
                userId: actor.id,
                organizationId: savedTeam.id,
                role: UserOrganization_1.OrgMemberRole.OWNER
            }));
        }
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.ORGANIZATION_CREATED,
            actorId,
            teamId: savedTeam.id,
            details: `${actor.fullName} created organization ${savedTeam.name}`
        });
        return savedTeam;
    }
    async searchOrganizations(query) {
        const where = query ? { name: (0, typeorm_1.ILike)(`%${query}%`) } : {};
        const teams = await this.teamRepo.find({ where, relations: ["members"], order: { createdAt: "DESC" }, take: 30 });
        return teams.map((team) => ({ id: team.id, name: team.name, createdAt: team.createdAt, membersCount: team.members?.length ?? 0 }));
    }
    async joinOrganization(actorId, teamId) {
        const user = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!user)
            throw new Error("User not found");
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team)
            throw new Error("Organization not found");
        user.team = team;
        user.organizationId = team.id;
        if (user.legacyRole !== User_1.UserRole.SUPER_ADMIN && user.legacyRole !== User_1.UserRole.SUDO_ADMIN) {
            user.legacyRole = User_1.UserRole.MEMBER;
        }
        const savedUser = await this.userRepo.save(user);
        const existingMembership = await this.userOrganizationRepo.findOne({
            where: { userId: user.id, organizationId: team.id }
        });
        if (!existingMembership) {
            await this.userOrganizationRepo.save(this.userOrganizationRepo.create({
                userId: user.id,
                organizationId: team.id,
                role: UserOrganization_1.OrgMemberRole.MEMBER
            }));
        }
        await this.activityLogService.log({
            action: ActivityLog_1.ActivityAction.MEMBER_JOINED,
            actorId,
            targetUserId: actorId,
            teamId,
            details: `${savedUser.fullName} joined ${team.name}`
        });
        return savedUser;
    }
    async inviteMember(actorId, teamId, email, role) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        const roleEntity = await this.roleRepo.findOne({ where: { name: role } });
        const invite = this.inviteRepo.create({
            email,
            token,
            organizationId: teamId,
            role: roleEntity ?? undefined,
            roleId: roleEntity?.id,
            expiresAt,
            status: "pending",
            type: "organization",
            invitedBy: { id: actor.id }
        });
        await this.inviteRepo.save(invite);
        await this.activityLogService.log({ action: ActivityLog_1.ActivityAction.MEMBER_INVITED, actorId, teamId, details: `Invitation sent to ${email} with role ${role}` });
        return { token, inviteUrl: `http://localhost:3000/register?token=${token}&email=${encodeURIComponent(email)}`, emailSent: false };
    }
    async addMemberManually(actorId, teamId, name, email, role) {
        await this.ensureMemberManager(actorId, teamId);
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team)
            throw new Error("Organization not found");
        const existingUser = await this.userRepo.findOne({ where: { email }, relations: ["team"] });
        let savedUser;
        if (existingUser) {
            existingUser.fullName = name || existingUser.fullName;
            existingUser.legacyRole = role;
            existingUser.team = team;
            existingUser.organizationId = team.id;
            savedUser = await this.userRepo.save(existingUser);
        }
        else {
            const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
            const hashedPassword = await (0, auth_1.hashPassword)(tempPassword);
            const createdUser = this.userRepo.create({ fullName: name, email, password: hashedPassword, legacyRole: role, team, organizationId: team.id });
            savedUser = await this.userRepo.save(createdUser);
        }
        const existingMembership = await this.userOrganizationRepo.findOne({
            where: { userId: savedUser.id, organizationId: team.id }
        });
        if (!existingMembership) {
            await this.userOrganizationRepo.save(this.userOrganizationRepo.create({
                userId: savedUser.id,
                organizationId: team.id,
                role: role === User_1.UserRole.SUPER_ADMIN || role === User_1.UserRole.SUDO_ADMIN ? UserOrganization_1.OrgMemberRole.ADMIN : UserOrganization_1.OrgMemberRole.MEMBER
            }));
        }
        await this.activityLogService.log({ action: ActivityLog_1.ActivityAction.MEMBER_ADDED, actorId, targetUserId: savedUser.id, teamId, details: `${savedUser.email} added manually with role ${role}` });
        return savedUser;
    }
    async updateMemberRole(actorId, teamId, memberId, role) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId)
            throw new Error("Member not found in organization");
        member.legacyRole = role;
        const saved = await this.userRepo.save(member);
        await this.activityLogService.log({ action: ActivityLog_1.ActivityAction.MEMBER_ROLE_UPDATED, actorId, targetUserId: memberId, teamId, details: `${saved.email} role changed to ${role}` });
        return saved;
    }
    async removeMember(actorId, teamId, memberId) {
        await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId)
            throw new Error("Member not found in organization");
        member.team = undefined;
        member.organizationId = undefined;
        if (member.legacyRole !== User_1.UserRole.SUDO_ADMIN)
            member.legacyRole = User_1.UserRole.MEMBER;
        const saved = await this.userRepo.save(member);
        await this.userOrganizationRepo.delete({ userId: memberId, organizationId: teamId });
        await this.activityLogService.log({ action: ActivityLog_1.ActivityAction.MEMBER_REMOVED, actorId, targetUserId: memberId, teamId, details: `${saved.email} removed from organization` });
        return { id: saved.id, email: saved.email };
    }
    async getMembers(teamId) {
        const team = await this.teamRepo.findOne({ where: { id: teamId }, relations: ["members"] });
        if (!team)
            throw new Error("Organization not found");
        return team.members;
    }
    async getActivity(teamId, limit = 50) {
        await this.teamRepo.findOneOrFail({ where: { id: teamId } });
        return this.activityLogService.getTeamActivity(teamId, limit);
    }
    async getMemberPermissions(actorId, teamId, memberId) {
        await this.ensureMemberManager(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId)
            throw new Error("Member not found in organization");
        const explicit = await this.permissionRepo.find({ where: { team: { id: teamId }, user: { id: memberId } } });
        const effective = await this.permissionService.getEffectivePermissions(member);
        return { memberId, explicitPermissions: explicit.map((entry) => entry.permission), effectivePermissions: Array.from(effective) };
    }
    async setMemberPermissions(actorId, teamId, memberId, permissions) {
        const actor = await this.ensureMemberManager(actorId, teamId);
        this.ensureCreatorCanAssignSensitivePermissions(actor, permissions);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId)
            throw new Error("Member not found in organization");
        if (member.id === actor.id && permissions.includes(access_1.PermissionKey.MEMBER_MANAGE) === false) {
            throw new Error("You cannot revoke your own member management permission");
        }
        const deduped = Array.from(new Set(permissions));
        const validPermissions = deduped.filter((permission) => Object.values(access_1.PermissionKey).includes(permission));
        await this.permissionRepo.delete({ team: { id: teamId }, user: { id: memberId } });
        if (validPermissions.length > 0) {
            const rows = validPermissions.map((permission) => this.permissionRepo.create({ team: { id: teamId }, user: { id: memberId }, grantedBy: { id: actor.id }, permission }));
            await this.permissionRepo.save(rows);
        }
        await this.activityLogService.log({ action: ActivityLog_1.ActivityAction.MEMBER_ROLE_UPDATED, actorId, targetUserId: memberId, teamId, details: `Updated member permissions: ${validPermissions.join(", ") || "none"}` });
        return this.getMemberPermissions(actorId, teamId, memberId);
    }
}
exports.OrganizationService = OrganizationService;
exports.organizationService = new OrganizationService();
