import { AppDataSource } from "../config/data-source";
import { TeamRole } from "../entities/TeamRole";
import { TeamMembership } from "../entities/TeamMembership";
import { Team } from "../entities/Team";
import { ApiError } from "../middlewares/errorHandler";

const DEFAULT_TEAM_ROLES = [
    "Team Lead",
    "Frontend",
    "Backend",
    "QA",
    "DevOps",
    "Designer",
];

export class TeamRoleService {
    private roleRepo = AppDataSource.getRepository(TeamRole);
    private membershipRepo = AppDataSource.getRepository(TeamMembership);
    private teamRepo = AppDataSource.getRepository(Team);

    /**
     * Get all team roles for an organization
     */
    async getRolesByOrganization(organizationId: string): Promise<TeamRole[]> {
        return this.roleRepo.find({
            where: { organizationId },
            order: { isSystem: "DESC", name: "ASC" },
        });
    }

    /**
     * Create a custom team role
     */
    async createRole(organizationId: string, name: string): Promise<TeamRole> {
        const existing = await this.roleRepo.findOne({
            where: { organizationId, name },
        });
        if (existing) {
            throw new ApiError("A role with this name already exists in this organization", 409);
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
    async deleteRole(roleId: string): Promise<void> {
        const role = await this.roleRepo.findOne({ where: { id: roleId } });
        if (!role) throw new ApiError("Team role not found", 404);
        if (role.isSystem) throw new ApiError("Cannot delete a system role", 400);

        // Check if any memberships use this role
        const count = await this.membershipRepo.count({ where: { teamRoleId: roleId } });
        if (count > 0) {
            throw new ApiError("Cannot delete role while team members are assigned to it", 400);
        }

        await this.roleRepo.remove(role);
    }

    /**
     * Seed default system roles for an organization (idempotent)
     */
    async seedDefaultRoles(organizationId: string): Promise<TeamRole[]> {
        const existing = await this.roleRepo.find({
            where: { organizationId, isSystem: true },
        });

        const existingNames = new Set(existing.map((r) => r.name));
        const toCreate = DEFAULT_TEAM_ROLES.filter((name) => !existingNames.has(name));

        if (toCreate.length === 0) return existing;

        const newRoles = toCreate.map((name) =>
            this.roleRepo.create({ organizationId, name, isSystem: true })
        );
        const saved = await this.roleRepo.save(newRoles);
        return [...existing, ...saved];
    }

    /**
     * Add a member to a team with a specific role
     */
    async addTeamMember(teamId: string, userId: string, teamRoleId: string): Promise<TeamMembership> {
        // Verify team exists
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) throw new ApiError("Team not found", 404);

        // Verify role exists
        const role = await this.roleRepo.findOne({ where: { id: teamRoleId } });
        if (!role) throw new ApiError("Team role not found", 404);

        // Check for existing membership
        const existing = await this.membershipRepo.findOne({
            where: { teamId, userId },
        });
        if (existing) {
            throw new ApiError("User is already a member of this team", 409);
        }

        const membership = this.membershipRepo.create({
            teamId,
            userId,
            teamRoleId,
        });
        return this.membershipRepo.save(membership);
    }

    /**
     * Update a team member's role
     */
    async updateTeamMemberRole(teamId: string, userId: string, teamRoleId: string): Promise<TeamMembership> {
        const membership = await this.membershipRepo.findOne({
            where: { teamId, userId },
        });
        if (!membership) throw new ApiError("Team membership not found", 404);

        const role = await this.roleRepo.findOne({ where: { id: teamRoleId } });
        if (!role) throw new ApiError("Team role not found", 404);

        membership.teamRoleId = teamRoleId;
        return this.membershipRepo.save(membership);
    }

    /**
     * Remove a member from a team
     */
    async removeTeamMember(teamId: string, userId: string): Promise<void> {
        const membership = await this.membershipRepo.findOne({
            where: { teamId, userId },
        });
        if (!membership) throw new ApiError("Team membership not found", 404);

        await this.membershipRepo.remove(membership);
    }

    /**
     * Get all members of a team (with roles)
     */
    async getTeamMembers(teamId: string): Promise<TeamMembership[]> {
        return this.membershipRepo.find({
            where: { teamId },
            relations: ["user", "teamRole"],
            order: { joinedAt: "ASC" },
        });
    }
}

export const teamRoleService = new TeamRoleService();
