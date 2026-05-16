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
class OrganizationService {
    constructor() {
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
        this.activityLogService = new ActivityLogService_1.ActivityLogService();
    }
    async ensureOrgAdmin(actorId, teamId) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team"]
        });
        if (!actor) {
            throw new Error("Actor user not found");
        }
        const sameTeam = actor.team?.id === teamId;
        const canManage = actor.role === User_1.UserRole.SUPER_ADMIN || (sameTeam && actor.role === User_1.UserRole.PROJECT_MANAGER);
        if (!canManage) {
            throw new Error("You do not have permission to manage this organization");
        }
        return actor;
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
        const team = this.teamRepo.create({ name });
        const savedTeam = await this.teamRepo.save(team);
        actor.team = savedTeam;
        if (actor.role !== User_1.UserRole.SUPER_ADMIN) {
            actor.role = User_1.UserRole.PROJECT_MANAGER;
        }
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
        if (user.role !== User_1.UserRole.SUPER_ADMIN && user.role !== User_1.UserRole.PROJECT_MANAGER) {
            user.role = User_1.UserRole.TEAM_MEMBER;
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
        await this.ensureOrgAdmin(actorId, teamId);
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        const invite = this.inviteRepo.create({
            email,
            token,
            role,
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
        return {
            token,
            inviteUrl: `http://localhost:3000/register?token=${token}&email=${encodeURIComponent(email)}`
        };
    }
    async addMemberManually(actorId, teamId, name, email, role) {
        await this.ensureOrgAdmin(actorId, teamId);
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new Error("Organization not found");
        }
        const existingUser = await this.userRepo.findOne({ where: { email }, relations: ["team"] });
        let savedUser;
        if (existingUser) {
            existingUser.name = name || existingUser.name;
            existingUser.role = role;
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
                role,
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
        await this.ensureOrgAdmin(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }
        member.role = role;
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
        await this.ensureOrgAdmin(actorId, teamId);
        const member = await this.userRepo.findOne({ where: { id: memberId }, relations: ["team"] });
        if (!member || member.team?.id !== teamId) {
            throw new Error("Member not found in organization");
        }
        member.team = undefined;
        if (member.role !== User_1.UserRole.SUPER_ADMIN) {
            member.role = User_1.UserRole.TEAM_MEMBER;
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
    async getMembers(teamId) {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ["members"]
        });
        if (!team) {
            throw new Error("Organization not found");
        }
        return team.members;
    }
    async getActivity(teamId, limit = 50) {
        await this.teamRepo.findOneOrFail({ where: { id: teamId } });
        return this.activityLogService.getTeamActivity(teamId, limit);
    }
}
exports.OrganizationService = OrganizationService;
