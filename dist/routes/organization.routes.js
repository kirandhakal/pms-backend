"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const permission_1 = require("../middlewares/permission");
const tenantResolver_1 = require("../middlewares/tenantResolver");
const auditLogger_1 = require("../middlewares/auditLogger");
const AuditLog_1 = require("../entities/AuditLog");
const permissions_1 = require("../config/permissions");
const OrganizationService_1 = require("../services/OrganizationService");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
    description: zod_1.z.string().max(500).optional(),
    settings: zod_1.z.object({
        features: zod_1.z.object({
            guestAccess: zod_1.z.boolean().optional(),
            departmentVisibility: zod_1.z.boolean().optional(),
            auditLogging: zod_1.z.boolean().optional()
        }).optional(),
        limits: zod_1.z.object({
            maxUsers: zod_1.z.number().optional(),
            maxDepartments: zod_1.z.number().optional(),
            maxWorkflows: zod_1.z.number().optional()
        }).optional()
    }).optional()
});
const updateOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    settings: zod_1.z.object({}).passthrough().optional(),
    isActive: zod_1.z.boolean().optional()
});
/**
 * @route   POST /api/organizations
 * @desc    Create a new organization
 * @access  SuperAdmin+
 */
router.post("/", auth_1.authenticate, permission_1.loadPermissions, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.SUPER_ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.ORGANIZATIONS, permissions_1.PermissionAction.CREATE), (0, validate_1.validateBody)(createOrganizationSchema), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.CREATE, resource: "organizations" }), async (req, res, next) => {
    try {
        const organization = await OrganizationService_1.organizationService.createOrganization({
            ...req.body,
            ownerId: req.user?.id
        });
        res.status(201).json({
            message: "Organization created successfully",
            data: organization
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/organizations
 * @desc    List all organizations
 * @access  SuperAdmin+
 */
router.get("/", auth_1.authenticate, permission_1.loadPermissions, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.SUPER_ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.ORGANIZATIONS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const { isActive, search, page, limit } = req.query;
        const result = await OrganizationService_1.organizationService.listOrganizations({
            isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
            search: search,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        });
        res.json({
            data: result.organizations,
            pagination: {
                total: result.total,
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
                pages: Math.ceil(result.total / (limit ? parseInt(limit) : 20))
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization details
 * @access  Admin+
 */
router.get("/:id", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.ORGANIZATIONS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const includeRelations = req.query.include === "full";
        const organization = await OrganizationService_1.organizationService.getOrganizationById(String(String(req.params.id)), includeRelations);
        if (!organization) {
            return res.status(404).json({ message: "Organization not found" });
        }
        res.json({ data: organization });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Admin+
 */
router.put("/:id", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.ORGANIZATIONS, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(updateOrganizationSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.UPDATE,
    resource: "organizations",
    getResourceId: (req) => String(req.params.id)
}), async (req, res, next) => {
    try {
        const organization = await OrganizationService_1.organizationService.updateOrganization(String(String(req.params.id)), req.body);
        res.json({
            message: "Organization updated successfully",
            data: organization
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/organizations/:id
 * @desc    Delete organization (soft delete)
 * @access  SuperAdmin+
 */
router.delete("/:id", auth_1.authenticate, permission_1.loadPermissions, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.SUPER_ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.ORGANIZATIONS, permissions_1.PermissionAction.DELETE), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.DELETE,
    resource: "organizations",
    getResourceId: (req) => String(req.params.id)
}), async (req, res, next) => {
    try {
        await OrganizationService_1.organizationService.deleteOrganization(String(req.params.id));
        res.json({ message: "Organization deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/organizations/:id/stats
 * @desc    Get organization statistics
 * @access  Admin+
 */
router.get("/:id/stats", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.ORGANIZATIONS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const stats = await OrganizationService_1.organizationService.getOrganizationStats(String(req.params.id));
        res.json({ data: stats });
    }
    catch (error) {
        next(error);
    }
});
// ==================== Department Sub-routes ====================
/**
 * @route   POST /api/organizations/:organizationId/departments
 * @desc    Create department in organization
 * @access  Admin+
 */
router.post("/:organizationId/departments", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.DEPARTMENTS, permissions_1.PermissionAction.CREATE), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.CREATE, resource: "departments" }), async (req, res, next) => {
    try {
        const department = await OrganizationService_1.organizationService.createDepartment({
            ...req.body,
            organizationId: req.params.organizationId
        });
        res.status(201).json({
            message: "Department created successfully",
            data: department
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/organizations/:organizationId/departments
 * @desc    List departments in organization
 * @access  Member+
 */
router.get("/:organizationId/departments", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.DEPARTMENTS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const { includeInvisible, includeMembers } = req.query;
        const departments = await OrganizationService_1.organizationService.listDepartments(String(req.params.organizationId), {
            includeInvisible: includeInvisible === "true",
            includeMembers: includeMembers === "true"
        });
        res.json({ data: departments });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
