import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { authorize, loadPermissions, requireRoleLevel } from "../middlewares/permission";
import { resolveTenant } from "../middlewares/tenantResolver";
import { auditLog } from "../middlewares/auditLogger";
import { AuditAction } from "../entities/AuditLog";
import { PermissionResource, PermissionAction, RoleLevel } from "../config/permissions";
import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";
import { ApiError } from "../middlewares/errorHandler";
import { clearAllPermissionCache } from "../middlewares/permission";
import { TenantRequest } from "../middlewares/tenantResolver";

const router = Router();

// Validation schemas
const createRoleSchema = z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(200).optional(),
    level: z.nativeEnum(RoleLevel),
    permissionIds: z.array(z.string().uuid()).optional()
});

const updateRoleSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().max(200).optional(),
    level: z.nativeEnum(RoleLevel).optional(),
    isActive: z.boolean().optional()
});

const updatePermissionsSchema = z.object({
    permissionIds: z.array(z.string().uuid())
});

/**
 * @route   GET /api/roles
 * @desc    List all roles
 * @access  Admin+
 */
router.get(
    "/",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.ROLES, PermissionAction.READ),
    async (req: TenantRequest, res, next) => {
        try {
            const roleRepo = AppDataSource.getRepository(Role);
            
            const query = roleRepo.createQueryBuilder("role")
                .leftJoinAndSelect("role.permissions", "permissions")
                .where("role.isActive = :isActive", { isActive: true })
                .orderBy("role.level", "ASC");

            // Filter by organization or show system roles
            if (req.tenant?.organizationId) {
                query.andWhere(
                    "(role.organizationId = :orgId OR role.organizationId IS NULL)",
                    { orgId: req.tenant.organizationId }
                );
            } else {
                query.andWhere("role.organizationId IS NULL");
            }

            const roles = await query.getMany();

            res.json({ data: roles });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role details
 * @access  Admin+
 */
router.get(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.ROLES, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const roleRepo = AppDataSource.getRepository(Role);
            
            const role = await roleRepo.findOne({
                where: { id: String(req.params.id) },
                relations: ["permissions"]
            });

            if (!role) {
                return res.status(404).json({ message: "Role not found" });
            }

            res.json({ data: role });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   POST /api/roles
 * @desc    Create custom role
 * @access  Admin+
 */
router.post(
    "/",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireRoleLevel(RoleLevel.ADMIN),
    authorize(PermissionResource.ROLES, PermissionAction.CREATE),
    validateBody(createRoleSchema),
    auditLog({ action: AuditAction.CREATE, resource: "roles" }),
    async (req: TenantRequest, res, next) => {
        try {
            const { name, description, level, permissionIds } = req.body;
            
            const roleRepo = AppDataSource.getRepository(Role);
            const permissionRepo = AppDataSource.getRepository(Permission);

            // Check if role name already exists in org
            const existing = await roleRepo.findOne({
                where: [
                    { name, organizationId: req.tenant?.organizationId },
                    { name, isSystem: true }
                ]
            });

            if (existing) {
                throw new ApiError("Role with this name already exists", 409);
            }

            // Validate creator can only create roles at their level or below
            if (req.userContext && level < req.userContext.roleLevel) {
                throw new ApiError("Cannot create role with higher privileges than your own", 403);
            }

            // Get permissions
            let permissions: Permission[] = [];
            if (permissionIds?.length) {
                permissions = await permissionRepo.findBy(
                    permissionIds.map((id: string) => ({ id }))
                );
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
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   PUT /api/roles/:id
 * @desc    Update role
 * @access  Admin+
 */
router.put(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireRoleLevel(RoleLevel.ADMIN),
    authorize(PermissionResource.ROLES, PermissionAction.UPDATE),
    validateBody(updateRoleSchema),
    auditLog({ 
        action: AuditAction.UPDATE, 
        resource: "roles",
        getResourceId: (req) => String(req.params.id)
    }),
    async (req, res, next) => {
        try {
            const roleRepo = AppDataSource.getRepository(Role);
            
            const role = await roleRepo.findOne({ where: { id: String(req.params.id) } });

            if (!role) {
                return res.status(404).json({ message: "Role not found" });
            }

            if (role.isSystem) {
                throw new ApiError("Cannot modify system roles", 403);
            }

            Object.assign(role, req.body);
            await roleRepo.save(role);

            // Clear permission cache for all users with this role
            clearAllPermissionCache();

            res.json({
                message: "Role updated successfully",
                data: role
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   PUT /api/roles/:id/permissions
 * @desc    Update role permissions
 * @access  SuperAdmin+
 */
router.put(
    "/:id/permissions",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireRoleLevel(RoleLevel.SUPER_ADMIN),
    authorize(PermissionResource.PERMISSIONS, PermissionAction.MANAGE),
    validateBody(updatePermissionsSchema),
    auditLog({ 
        action: AuditAction.PERMISSION_CHANGE, 
        resource: "roles",
        getResourceId: (req) => String(String(req.params.id)),
        getDescription: () => "Updated role permissions"
    }),
    async (req, res, next) => {
        try {
            const { permissionIds } = req.body;
            
            const roleRepo = AppDataSource.getRepository(Role);
            const permissionRepo = AppDataSource.getRepository(Permission);

            const role = await roleRepo.findOne({
                where: { id: String(req.params.id) },
                relations: ["permissions"]
            });

            if (!role) {
                return res.status(404).json({ message: "Role not found" });
            }

            // Get new permissions
            const permissions = await permissionRepo.findBy(
                permissionIds.map((id: string) => ({ id }))
            );

            role.permissions = permissions;
            await roleRepo.save(role);

            // Clear permission cache
            clearAllPermissionCache();

            res.json({
                message: "Role permissions updated successfully",
                data: role
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete role
 * @access  SuperAdmin+
 */
router.delete(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireRoleLevel(RoleLevel.SUPER_ADMIN),
    authorize(PermissionResource.ROLES, PermissionAction.DELETE),
    auditLog({ 
        action: AuditAction.DELETE, 
        resource: "roles",
        getResourceId: (req) => String(req.params.id)
    }),
    async (req, res, next) => {
        try {
            const roleRepo = AppDataSource.getRepository(Role);
            
            const role = await roleRepo.findOne({
                where: { id: String(req.params.id) },
                relations: ["users"]
            });

            if (!role) {
                return res.status(404).json({ message: "Role not found" });
            }

            if (role.isSystem) {
                throw new ApiError("Cannot delete system roles", 403);
            }

            if (role.users?.length > 0) {
                throw new ApiError("Cannot delete role with assigned users", 400);
            }

            role.isActive = false;
            await roleRepo.save(role);

            res.json({ message: "Role deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/permissions
 * @desc    List all permissions
 * @access  Admin+
 */
router.get(
    "/permissions/all",
    authenticate,
    loadPermissions,
    authorize(PermissionResource.PERMISSIONS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const permissionRepo = AppDataSource.getRepository(Permission);
            
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
            }, {} as Record<string, Permission[]>);

            res.json({ 
                data: permissions,
                grouped
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
