"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationService = exports.OrganizationService = void 0;
const data_source_1 = require("../config/data-source");
const Organization_1 = require("../entities/Organization");
const Department_1 = require("../entities/Department");
const User_1 = require("../entities/User");
const WorkflowEngine_1 = require("./WorkflowEngine");
const errorHandler_1 = require("../middlewares/errorHandler");
class OrganizationService {
    constructor() {
        this.orgRepo = data_source_1.AppDataSource.getRepository(Organization_1.Organization);
        this.deptRepo = data_source_1.AppDataSource.getRepository(Department_1.Department);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    /**
     * Create a new organization
     */
    async createOrganization(data) {
        // Generate slug if not provided
        const slug = data.slug || this.generateSlug(data.name);
        // Check slug uniqueness
        const existing = await this.orgRepo.findOne({ where: { slug } });
        if (existing) {
            throw new errorHandler_1.ApiError("Organization slug already exists", 409);
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
        await WorkflowEngine_1.workflowEngine.getOrCreateDefaultWorkflow(saved.id, data.ownerId);
        return saved;
    }
    /**
     * Get organization by ID
     */
    async getOrganizationById(id, includeRelations = false) {
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
    async getOrganizationBySlug(slug) {
        return this.orgRepo.findOne({ where: { slug } });
    }
    /**
     * List all organizations (for system admins)
     */
    async listOrganizations(filters) {
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
    async updateOrganization(id, data) {
        const org = await this.orgRepo.findOne({ where: { id } });
        if (!org) {
            throw new errorHandler_1.ApiError("Organization not found", 404);
        }
        if (data.name)
            org.name = data.name;
        if (data.description !== undefined)
            org.description = data.description;
        if (data.settings)
            org.settings = { ...org.settings, ...data.settings };
        if (data.isActive !== undefined)
            org.isActive = data.isActive;
        return this.orgRepo.save(org);
    }
    /**
     * Delete organization (soft delete)
     */
    async deleteOrganization(id) {
        const org = await this.orgRepo.findOne({ where: { id } });
        if (!org) {
            throw new errorHandler_1.ApiError("Organization not found", 404);
        }
        org.isActive = false;
        await this.orgRepo.save(org);
    }
    /**
     * Get organization statistics
     */
    async getOrganizationStats(id) {
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
    async createDepartment(data) {
        // Verify organization exists
        const org = await this.orgRepo.findOne({ where: { id: data.organizationId } });
        if (!org) {
            throw new errorHandler_1.ApiError("Organization not found", 404);
        }
        // Verify manager exists if provided
        if (data.managerId) {
            const manager = await this.userRepo.findOne({ where: { id: data.managerId } });
            if (!manager) {
                throw new errorHandler_1.ApiError("Manager not found", 404);
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
    async getDepartmentById(id, includeMembers = false) {
        const relations = includeMembers ? ["members", "manager"] : ["manager"];
        return this.deptRepo.findOne({
            where: { id },
            relations
        });
    }
    /**
     * List departments in organization
     */
    async listDepartments(organizationId, options) {
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
    async updateDepartment(id, data) {
        const dept = await this.deptRepo.findOne({ where: { id } });
        if (!dept) {
            throw new errorHandler_1.ApiError("Department not found", 404);
        }
        Object.assign(dept, data);
        return this.deptRepo.save(dept);
    }
    /**
     * Delete department (soft delete)
     */
    async deleteDepartment(id) {
        const dept = await this.deptRepo.findOne({
            where: { id },
            relations: ["members"]
        });
        if (!dept) {
            throw new errorHandler_1.ApiError("Department not found", 404);
        }
        // Check for members
        if (dept.members?.length > 0) {
            throw new errorHandler_1.ApiError("Cannot delete department with members. Reassign members first.", 400);
        }
        dept.isActive = false;
        await this.deptRepo.save(dept);
    }
    /**
     * Add member to department
     */
    async addMemberToDepartment(departmentId, userId) {
        const [dept, user] = await Promise.all([
            this.deptRepo.findOne({ where: { id: departmentId } }),
            this.userRepo.findOne({ where: { id: userId } })
        ]);
        if (!dept) {
            throw new errorHandler_1.ApiError("Department not found", 404);
        }
        if (!user) {
            throw new errorHandler_1.ApiError("User not found", 404);
        }
        // Verify same organization
        if (user.organizationId && user.organizationId !== dept.organizationId) {
            throw new errorHandler_1.ApiError("User belongs to different organization", 400);
        }
        user.departmentId = departmentId;
        user.organizationId = dept.organizationId;
        return this.userRepo.save(user);
    }
    /**
     * Remove member from department
     */
    async removeMemberFromDepartment(departmentId, userId) {
        const user = await this.userRepo.findOne({ where: { id: userId, departmentId } });
        if (!user) {
            throw new errorHandler_1.ApiError("User not found in department", 404);
        }
        user.departmentId = undefined;
        return this.userRepo.save(user);
    }
    /**
     * Assign manager to department
     */
    async assignManager(departmentId, managerId) {
        const [dept, manager] = await Promise.all([
            this.deptRepo.findOne({ where: { id: departmentId } }),
            this.userRepo.findOne({ where: { id: managerId } })
        ]);
        if (!dept) {
            throw new errorHandler_1.ApiError("Department not found", 404);
        }
        if (!manager) {
            throw new errorHandler_1.ApiError("Manager not found", 404);
        }
        dept.managerId = managerId;
        return this.deptRepo.save(dept);
    }
    // ==================== Utility Methods ====================
    /**
     * Generate URL-friendly slug from name
     */
    generateSlug(name) {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        // Add random suffix for uniqueness
        const suffix = Math.random().toString(36).substring(2, 6);
        return `${baseSlug}-${suffix}`;
    }
}
exports.OrganizationService = OrganizationService;
// Export singleton instance
exports.organizationService = new OrganizationService();
