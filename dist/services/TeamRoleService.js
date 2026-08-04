"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRoleService = exports.TeamRoleService = void 0;
const data_source_1 = require("../config/data-source");
const TeamRole_1 = require("../entities/TeamRole");
const TeamMembership_1 = require("../entities/TeamMembership");
const Team_1 = require("../entities/Team");
const User_1 = require("../entities/User");
const errorHandler_1 = require("../middlewares/errorHandler");
const DEFAULT_TEAM_ROLES = [
    "Team Lead",
    "Frontend",
    "Backend",
    "QA",
    "DevOps",
    "Designer",
];
class TeamRoleService {
    constructor() {
        this.roleRepo = data_source_1.AppDataSource.getRepository(TeamRole_1.TeamRole);
        this.membershipRepo = data_source_1.AppDataSource.getRepository(TeamMembership_1.TeamMembership);
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    /**
     * Get all team roles for an organization
     */
    async getRolesByOrganization(organizationId) {
        return this.roleRepo.find({
            where: { organizationId },
            order: { isSystem: "DESC", name: "ASC" },
        });
    }
    /**
     * Create a custom team role
     */
    async createRole(organizationId, name) {
        const existing = await this.roleRepo.findOne({
            where: { organizationId, name },
        });
        if (existing) {
            throw new errorHandler_1.ApiError("A role with this name already exists in this organization", 409);
        }
        const role = this.roleRepo.create({
            organizationId,
            name,
            isSystem: false,
        });
        return this.roleRepo.save(role);
    }
    /**
     * Delete a custom team role (system roles cannot be deleted)
     */
    async deleteRole(roleId) {
        const role = await this.roleRepo.findOne({ where: { id: roleId } });
        if (!role)
            throw new errorHandler_1.ApiError("Team role not found", 404);
        if (role.isSystem)
            throw new errorHandler_1.ApiError("Cannot delete a system role", 400);
        // Check if any memberships use this role
        const count = await this.membershipRepo.count({ where: { teamRoleId: roleId } });
        if (count > 0) {
            throw new errorHandler_1.ApiError("Cannot delete role while team members are assigned to it", 400);
        }
        await this.roleRepo.remove(role);
    }
    /**
     * Seed default system roles for an organization (idempotent)
     */
    async seedDefaultRoles(organizationId) {
        const existing = await this.roleRepo.find({
            where: { organizationId, isSystem: true },
        });
        const existingNames = new Set(existing.map((r) => r.name));
        const toCreate = DEFAULT_TEAM_ROLES.filter((name) => !existingNames.has(name));
        if (toCreate.length === 0)
            return existing;
        const newRoles = toCreate.map((name) => this.roleRepo.create({ organizationId, name, isSystem: true }));
        const saved = await this.roleRepo.save(newRoles);
        return [...existing, ...saved];
    }
    /**
     * Add a member to a team with a specific role
     */
    async addTeamMember(teamId, userId, teamRoleId) {
        // Verify team exists
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team)
            throw new errorHandler_1.ApiError("Team not found", 404);
        // Verify role exists
        const role = await this.roleRepo.findOne({ where: { id: teamRoleId } });
        if (!role)
            throw new errorHandler_1.ApiError("Team role not found", 404);
        // Check for existing membership
        const existing = await this.membershipRepo.findOne({
            where: { teamId, userId },
            relations: ["user", "teamRole"],
        });
        if (existing) {
            existing.teamRoleId = teamRoleId;
            existing.teamRole = role;
            return this.membershipRepo.save(existing);
        }
        const membership = this.membershipRepo.create({
            teamId,
            userId,
            teamRoleId,
        });
        const saved = await this.membershipRepo.save(membership);
        return this.membershipRepo.findOne({
            where: { id: saved.id },
            relations: ["user", "teamRole"],
        });
    }
    /**
     * Update a team member's role (upsert — creates membership if missing)
     */
    async updateTeamMemberRole(teamId, userId, teamRoleId) {
        const membership = await this.membershipRepo.findOne({
            where: { teamId, userId },
        });
        if (!membership) {
            return this.addTeamMember(teamId, userId, teamRoleId);
        }
        const role = await this.roleRepo.findOne({ where: { id: teamRoleId } });
        if (!role)
            throw new errorHandler_1.ApiError("Team role not found", 404);
        membership.teamRoleId = teamRoleId;
        await this.membershipRepo.save(membership);
        return this.membershipRepo.findOne({
            where: { id: membership.id },
            relations: ["user", "teamRole"],
        });
    }
    /**
     * Remove a member from a team
     */
    async removeTeamMember(teamId, userId) {
        const membership = await this.membershipRepo.findOne({
            where: { teamId, userId },
        });
        if (!membership)
            throw new errorHandler_1.ApiError("Team membership not found", 404);
        await this.membershipRepo.remove(membership);
    }
    /**
     * Get all org/team users with their typed sub-role (left-join style).
     * Users without a TeamMembership still appear so roles can be assigned.
     */
    async getTeamMembers(teamId) {
        const users = await this.userRepo.find({
            where: { team: { id: teamId } },
            select: ["id", "username", "fullName", "email"],
            order: { fullName: "ASC" },
        });
        const memberships = await this.membershipRepo.find({
            where: { teamId },
            relations: ["user", "teamRole"],
        });
        const byUser = new Map(memberships.map((m) => [m.userId, m]));
        return users.map((user) => {
            const membership = byUser.get(user.id);
            if (membership) {
                membership.user = user;
                return membership;
            }
            return {
                id: null,
                teamId,
                userId: user.id,
                teamRoleId: null,
                joinedAt: null,
                user,
                teamRole: null,
            };
        });
    }
}
exports.TeamRoleService = TeamRoleService;
exports.teamRoleService = new TeamRoleService();
