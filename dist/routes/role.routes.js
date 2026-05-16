"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const permission_1 = require("../middlewares/permission");
const tenantResolver_1 = require("../middlewares/tenantResolver");
const auditLogger_1 = require("../middlewares/auditLogger");
const AuditLog_1 = require("../entities/AuditLog");
const permissions_1 = require("../config/permissions");
const data_source_1 = require("../config/data-source");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const errorHandler_1 = require("../middlewares/errorHandler");
const permission_2 = require("../middlewares/permission");
const router = (0, express_1.Router)();
// Validation schemas
const createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50),
    description: zod_1.z.string().max(200).optional(),
    level: zod_1.z.nativeEnum(permissions_1.RoleLevel),
    permissionIds: zod_1.z.array(zod_1.z.string().uuid()).optional()
});
const updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    description: zod_1.z.string().max(200).optional(),
    level: zod_1.z.nativeEnum(permissions_1.RoleLevel).optional(),
    isActive: zod_1.z.boolean().optional()
});
const updatePermissionsSchema = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.string().uuid())
});
/**
 * @route   GET /api/roles
 * @desc    List all roles
 * @access  Admin+
 */
router.get("/", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.ROLES, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const query = roleRepo.createQueryBuilder("role")
            .leftJoinAndSelect("role.permissions", "permissions")
            .where("role.isActive = :isActive", { isActive: true })
            .orderBy("role.level", "ASC");
        // Filter by organization or show system roles
        if (req.tenant?.organizationId) {
            query.andWhere("(role.organizationId = :orgId OR role.organizationId IS NULL)", { orgId: req.tenant.organizationId });
        }
        else {
            query.andWhere("role.organizationId IS NULL");
        }
        const roles = await query.getMany();
        res.json({ data: roles });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/roles/:id
 * @desc    Get role details
 * @access  Admin+
 */
router.get("/:id", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.ROLES, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const role = await roleRepo.findOne({
            where: { id: String(req.params.id) },
            relations: ["permissions"]
        });
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        res.json({ data: role });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/roles
 * @desc    Create custom role
 * @access  Admin+
 */
router.post("/", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.ROLES, permissions_1.PermissionAction.CREATE), (0, validate_1.validateBody)(createRoleSchema), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.CREATE, resource: "roles" }), async (req, res, next) => {
    try {
        const { name, description, level, permissionIds } = req.body;
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const permissionRepo = data_source_1.AppDataSource.getRepository(Permission_1.Permission);
        // Check if role name already exists in org
        const existing = await roleRepo.findOne({
            where: [
                { name, organizationId: req.tenant?.organizationId },
                { name, isSystem: true }
            ]
        });
        if (existing) {
            throw new errorHandler_1.ApiError("Role with this name already exists", 409);
        }
        // Validate creator can only create roles at their level or below
        if (req.userContext && level < req.userContext.roleLevel) {
            throw new errorHandler_1.ApiError("Cannot create role with higher privileges than your own", 403);
        }
        // Get permissions
        let permissions = [];
        if (permissionIds?.length) {
            permissions = await permissionRepo.findBy(permissionIds.map((id) => ({ id })));
        }
        const role = roleRepo.create({
            name,
            description,
            level,
            organizationId: req.tenant?.organizationId,
            isSystem: false,
            isActive: true,
            permissions
        });
        await roleRepo.save(role);
        res.status(201).json({
            message: "Role created successfully",
            data: role
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/roles/:id
 * @desc    Update role
 * @access  Admin+
 */
router.put("/:id", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.ROLES, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(updateRoleSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.UPDATE,
    resource: "roles",
    getResourceId: (req) => String(req.params.id)
}), async (req, res, next) => {
    try {
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const role = await roleRepo.findOne({ where: { id: String(req.params.id) } });
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        if (role.isSystem) {
            throw new errorHandler_1.ApiError("Cannot modify system roles", 403);
        }
        Object.assign(role, req.body);
        await roleRepo.save(role);
        // Clear permission cache for all users with this role
        (0, permission_2.clearAllPermissionCache)();
        res.json({
            message: "Role updated successfully",
            data: role
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/roles/:id/permissions
 * @desc    Update role permissions
 * @access  SuperAdmin+
 */
router.put("/:id/permissions", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.SUPER_ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.PERMISSIONS, permissions_1.PermissionAction.MANAGE), (0, validate_1.validateBody)(updatePermissionsSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.PERMISSION_CHANGE,
    resource: "roles",
    getResourceId: (req) => String(String(req.params.id)),
    getDescription: () => "Updated role permissions"
}), async (req, res, next) => {
    try {
        const { permissionIds } = req.body;
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const permissionRepo = data_source_1.AppDataSource.getRepository(Permission_1.Permission);
        const role = await roleRepo.findOne({
            where: { id: String(req.params.id) },
            relations: ["permissions"]
        });
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        // Get new permissions
        const permissions = await permissionRepo.findBy(permissionIds.map((id) => ({ id })));
        role.permissions = permissions;
        await roleRepo.save(role);
        // Clear permission cache
        (0, permission_2.clearAllPermissionCache)();
        res.json({
            message: "Role permissions updated successfully",
            data: role
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete role
 * @access  SuperAdmin+
 */
router.delete("/:id", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.SUPER_ADMIN), (0, permission_1.authorize)(permissions_1.PermissionResource.ROLES, permissions_1.PermissionAction.DELETE), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.DELETE,
    resource: "roles",
    getResourceId: (req) => String(req.params.id)
}), async (req, res, next) => {
    try {
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const role = await roleRepo.findOne({
            where: { id: String(req.params.id) },
            relations: ["users"]
        });
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        if (role.isSystem) {
            throw new errorHandler_1.ApiError("Cannot delete system roles", 403);
        }
        if (role.users?.length > 0) {
            throw new errorHandler_1.ApiError("Cannot delete role with assigned users", 400);
        }
        role.isActive = false;
        await roleRepo.save(role);
        res.json({ message: "Role deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/permissions
 * @desc    List all permissions
 * @access  Admin+
 */
router.get("/permissions/all", auth_1.authenticate, permission_1.loadPermissions, (0, permission_1.authorize)(permissions_1.PermissionResource.PERMISSIONS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const permissionRepo = data_source_1.AppDataSource.getRepository(Permission_1.Permission);
        const permissions = await permissionRepo.find({
            order: {
                resource: "ASC",
                action: "ASC",
                scope: "ASC"
            }
        });
        // Group by resource for easier display
        const grouped = permissions.reduce((acc, perm) => {
            if (!acc[perm.resource]) {
                acc[perm.resource] = [];
            }
            acc[perm.resource].push(perm);
            return acc;
        }, {});
        res.json({
            data: permissions,
            grouped
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
