<<<<<<< HEAD
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
=======
import { AppDataSource } from "../config/data-source";
import { Organization, OrganizationSettings } from "../entities/Organization";
import { Department } from "../entities/Department";
import { User } from "../entities/User";
import { workflowEngine } from "./WorkflowEngine";
import { ApiError } from "../middlewares/errorHandler";

export interface CreateOrganizationDTO {
    name: string;
    slug?: string;
    description?: string;
    ownerId?: string;
    settings?: OrganizationSettings;
}

export interface UpdateOrganizationDTO {
    name?: string;
    description?: string;
    settings?: OrganizationSettings;
    isActive?: boolean;
}

export interface CreateDepartmentDTO {
    name: string;
    description?: string;
    organizationId: string;
    managerId?: string;
    isVisible?: boolean;
}

export class OrganizationService {
    private orgRepo = AppDataSource.getRepository(Organization);
    private deptRepo = AppDataSource.getRepository(Department);
    private userRepo = AppDataSource.getRepository(User);

    /**
     * Create a new organization
     */
    async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
        // Generate slug if not provided
        const slug = data.slug || this.generateSlug(data.name);

        // Check slug uniqueness
        const existing = await this.orgRepo.findOne({ where: { slug } });
        if (existing) {
            throw new ApiError("Organization slug already exists", 409);
        }

        const organization = this.orgRepo.create({
            name: data.name,
            slug,
            description: data.description,
            ownerId: data.ownerId,
            settings: data.settings || {
                features: {
                    guestAccess: true,
                    departmentVisibility: true,
                    auditLogging: true
                }
            },
            isActive: true
        });

        const saved = await this.orgRepo.save(organization);

        // Create default workflow for organization
        await workflowEngine.getOrCreateDefaultWorkflow(saved.id, data.ownerId);
>>>>>>> new/rafc

        return saved;
    }

<<<<<<< HEAD
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
=======
    /**
     * Get organization by ID
     */
    async getOrganizationById(id: string, includeRelations = false): Promise<Organization | null> {
        if (includeRelations) {
            return this.orgRepo.findOne({
                where: { id },
                relations: ["departments", "users", "workflows"]
            });
        }
        return this.orgRepo.findOne({ where: { id } });
    }

    /**
     * Get organization by slug
     */
    async getOrganizationBySlug(slug: string): Promise<Organization | null> {
        return this.orgRepo.findOne({ where: { slug } });
    }

    /**
     * List all organizations (for system admins)
     */
    async listOrganizations(filters?: {
        isActive?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ organizations: Organization[]; total: number }> {
        const query = this.orgRepo.createQueryBuilder("org")
            .orderBy("org.createdAt", "DESC");

        if (filters?.isActive !== undefined) {
            query.andWhere("org.isActive = :isActive", { isActive: filters.isActive });
        }

        if (filters?.search) {
            query.andWhere("(org.name ILIKE :search OR org.slug ILIKE :search)", {
                search: `%${filters.search}%`
            });
        }

        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;

        const [organizations, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { organizations, total };
    }

    /**
     * Update organization
     */
    async updateOrganization(id: string, data: UpdateOrganizationDTO): Promise<Organization> {
        const org = await this.orgRepo.findOne({ where: { id } });
        
        if (!org) {
            throw new ApiError("Organization not found", 404);
        }

        if (data.name) org.name = data.name;
        if (data.description !== undefined) org.description = data.description;
        if (data.settings) org.settings = { ...org.settings, ...data.settings };
        if (data.isActive !== undefined) org.isActive = data.isActive;

        return this.orgRepo.save(org);
    }

    /**
     * Delete organization (soft delete)
     */
    async deleteOrganization(id: string): Promise<void> {
        const org = await this.orgRepo.findOne({ where: { id } });
        
        if (!org) {
            throw new ApiError("Organization not found", 404);
        }

        org.isActive = false;
        await this.orgRepo.save(org);
    }

    /**
     * Get organization statistics
     */
    async getOrganizationStats(id: string): Promise<{
        userCount: number;
        departmentCount: number;
        activeUserCount: number;
        taskCount: number;
        workflowCount: number;
    }> {
        const userCount = await this.userRepo.count({ where: { organizationId: id } });
        const activeUserCount = await this.userRepo.count({ where: { organizationId: id, isActive: true } });
        const departmentCount = await this.deptRepo.count({ where: { organizationId: id, isActive: true } });

        // Would need Task and Workflow repositories for full stats
        return {
            userCount,
            activeUserCount,
            departmentCount,
            taskCount: 0, // TODO: Implement
            workflowCount: 0 // TODO: Implement
        };
    }

    // ==================== Department Methods ====================

    /**
     * Create department
     */
    async createDepartment(data: CreateDepartmentDTO): Promise<Department> {
        // Verify organization exists
        const org = await this.orgRepo.findOne({ where: { id: data.organizationId } });
        if (!org) {
            throw new ApiError("Organization not found", 404);
        }

        // Verify manager exists if provided
        if (data.managerId) {
            const manager = await this.userRepo.findOne({ where: { id: data.managerId } });
            if (!manager) {
                throw new ApiError("Manager not found", 404);
            }
        }

        const department = this.deptRepo.create({
            name: data.name,
            description: data.description,
            organizationId: data.organizationId,
            managerId: data.managerId,
            isVisible: data.isVisible ?? true,
            isActive: true
        });

        return this.deptRepo.save(department);
    }

    /**
     * Get department by ID
     */
    async getDepartmentById(id: string, includeMembers = false): Promise<Department | null> {
        const relations = includeMembers ? ["members", "manager"] : ["manager"];
        return this.deptRepo.findOne({
            where: { id },
            relations
        });
    }

    /**
     * List departments in organization
     */
    async listDepartments(organizationId: string, options?: {
        includeInvisible?: boolean;
        includeMembers?: boolean;
    }): Promise<Department[]> {
        const query = this.deptRepo.createQueryBuilder("dept")
            .leftJoinAndSelect("dept.manager", "manager")
            .where("dept.organizationId = :organizationId", { organizationId })
            .andWhere("dept.isActive = :isActive", { isActive: true })
            .orderBy("dept.name", "ASC");

        if (!options?.includeInvisible) {
            query.andWhere("dept.isVisible = :isVisible", { isVisible: true });
        }

        if (options?.includeMembers) {
            query.leftJoinAndSelect("dept.members", "members");
        }

        return query.getMany();
    }

    /**
     * Update department
     */
    async updateDepartment(id: string, data: Partial<{
        name: string;
        description: string;
        managerId: string;
        isVisible: boolean;
    }>): Promise<Department> {
        const dept = await this.deptRepo.findOne({ where: { id } });
        
        if (!dept) {
            throw new ApiError("Department not found", 404);
        }

        Object.assign(dept, data);
        return this.deptRepo.save(dept);
    }

    /**
     * Delete department (soft delete)
     */
    async deleteDepartment(id: string): Promise<void> {
        const dept = await this.deptRepo.findOne({
            where: { id },
            relations: ["members"]
        });
        
        if (!dept) {
            throw new ApiError("Department not found", 404);
        }

        // Check for members
        if (dept.members?.length > 0) {
            throw new ApiError("Cannot delete department with members. Reassign members first.", 400);
        }

        dept.isActive = false;
        await this.deptRepo.save(dept);
    }

    /**
     * Add member to department
     */
    async addMemberToDepartment(departmentId: string, userId: string): Promise<User> {
        const [dept, user] = await Promise.all([
            this.deptRepo.findOne({ where: { id: departmentId } }),
            this.userRepo.findOne({ where: { id: userId } })
        ]);

        if (!dept) {
            throw new ApiError("Department not found", 404);
        }

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        // Verify same organization
        if (user.organizationId && user.organizationId !== dept.organizationId) {
            throw new ApiError("User belongs to different organization", 400);
        }

        user.departmentId = departmentId;
        user.organizationId = dept.organizationId;
        
        return this.userRepo.save(user);
    }

    /**
     * Remove member from department
     */
    async removeMemberFromDepartment(departmentId: string, userId: string): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id: userId, departmentId } });

        if (!user) {
            throw new ApiError("User not found in department", 404);
        }

        user.departmentId = undefined;
        return this.userRepo.save(user);
    }

    /**
     * Assign manager to department
     */
    async assignManager(departmentId: string, managerId: string): Promise<Department> {
        const [dept, manager] = await Promise.all([
            this.deptRepo.findOne({ where: { id: departmentId } }),
            this.userRepo.findOne({ where: { id: managerId } })
        ]);

        if (!dept) {
            throw new ApiError("Department not found", 404);
        }

        if (!manager) {
            throw new ApiError("Manager not found", 404);
        }

        dept.managerId = managerId;
        return this.deptRepo.save(dept);
    }

    // ==================== Utility Methods ====================

    /**
     * Generate URL-friendly slug from name
     */
    private generateSlug(name: string): string {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        
        // Add random suffix for uniqueness
        const suffix = Math.random().toString(36).substring(2, 6);
        return `${baseSlug}-${suffix}`;
    }
}

// Export singleton instance
export const organizationService = new OrganizationService();
>>>>>>> new/rafc
