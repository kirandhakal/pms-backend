"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDepartment = exports.requireOrganization = exports.requireRoleLevel = exports.authorize = exports.loadPermissions = void 0;
exports.clearPermissionCache = clearPermissionCache;
exports.clearAllPermissionCache = clearAllPermissionCache;
exports.hasPermission = hasPermission;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const permissions_1 = require("../config/permissions");
/**
 * Cache for user permissions to reduce database queries
 * In production, use Redis for distributed caching
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
/**
 * Load user permissions from database or cache
 */
async function loadUserPermissions(userId) {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return { permissions: cached.permissions, role: cached.role };
    }
    const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["role", "role.permissions"]
    });
    if (!user || !user.role) {
        return { permissions: [], role: null };
    }
    permissionCache.set(userId, {
        permissions: user.role.permissions || [],
        role: user.role,
        expiresAt: Date.now() + CACHE_TTL
    });
    return { permissions: user.role.permissions || [], role: user.role };
}
/**
 * Clear permission cache for a user (call after role/permission changes)
 */
function clearPermissionCache(userId) {
    permissionCache.delete(userId);
}
/**
 * Clear entire permission cache
 */
function clearAllPermissionCache() {
    permissionCache.clear();
}
/**
 * Middleware to load user permissions into request
 */
const loadPermissions = async (req, res, next) => {
    if (!req.user) {
        return next();
    }
    try {
        const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepo.findOne({
            where: { id: req.user.id },
            select: ["id", "organizationId", "departmentId"]
        });
        const { permissions, role } = await loadUserPermissions(req.user.id);
        req.userPermissions = permissions;
        req.userRole = role || undefined;
        req.userContext = {
            userId: req.user.id,
            roleLevel: role?.level ?? permissions_1.RoleLevel.GUEST,
            organizationId: user?.organizationId,
            departmentId: user?.departmentId
        };
        next();
    }
    catch (error) {
        console.error("Error loading permissions:", error);
        return res.status(500).json({ message: "Failed to load permissions" });
    }
};
exports.loadPermissions = loadPermissions;
/**
 * Permission check middleware factory
 *
 * @example
 * router.get("/users", authorize(PermissionResource.USERS, PermissionAction.READ), controller)
 */
const authorize = (resource, action) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Load permissions if not already loaded
        if (!req.userPermissions) {
            const { permissions, role } = await loadUserPermissions(req.user.id);
            const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["id", "organizationId", "departmentId"]
            });
            req.userPermissions = permissions;
            req.userRole = role || undefined;
            req.userContext = {
                userId: req.user.id,
                roleLevel: role?.level ?? permissions_1.RoleLevel.GUEST,
                organizationId: user?.organizationId,
                departmentId: user?.departmentId
            };
        }
        // Build permission check
        const check = {
            resource,
            action,
            targetOrganizationId: (typeof req.params.organizationId === 'string' ? req.params.organizationId : undefined) || req.body.organizationId,
            targetDepartmentId: (typeof req.params.departmentId === 'string' ? req.params.departmentId : undefined) || req.body.departmentId,
            targetOwnerId: typeof req.params.userId === 'string' ? req.params.userId : (typeof req.params.id === 'string' ? req.params.id : undefined)
        };
        // Check if any permission grants access
        const hasPermission = req.userPermissions?.some(permission => {
            return (0, permissions_1.permissionGrantsAccess)({
                resource: permission.resource,
                action: permission.action,
                scope: permission.scope
            }, check, {
                userId: req.userContext.userId,
                organizationId: req.userContext.organizationId,
                departmentId: req.userContext.departmentId
            });
        });
        if (!hasPermission) {
            return res.status(403).json({
                message: "Insufficient permissions",
                required: { resource, action }
            });
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Check minimum role level
 *
 * @example
 * router.post("/admin-only", requireRoleLevel(RoleLevel.ADMIN), controller)
 */
const requireRoleLevel = (maxLevel) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        if (!req.userContext) {
            const { role } = await loadUserPermissions(req.user.id);
            req.userContext = {
                userId: req.user.id,
                roleLevel: role?.level ?? permissions_1.RoleLevel.GUEST,
            };
        }
        // Lower level number = higher privilege
        if (req.userContext.roleLevel > maxLevel) {
            return res.status(403).json({
                message: "Insufficient role level",
                required: maxLevel,
                current: req.userContext.roleLevel
            });
        }
        next();
    };
};
exports.requireRoleLevel = requireRoleLevel;
/**
 * Require user to be in specific organization
 */
const requireOrganization = (orgIdParam = "organizationId") => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const targetOrgId = req.params[orgIdParam] || req.body[orgIdParam];
        if (!targetOrgId) {
            return res.status(400).json({ message: "Organization ID required" });
        }
        if (!req.userContext) {
            const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["id", "organizationId", "departmentId"]
            });
            req.userContext = {
                userId: req.user.id,
                roleLevel: permissions_1.RoleLevel.GUEST,
                organizationId: user?.organizationId,
                departmentId: user?.departmentId
            };
        }
        // System/Super admins can access any organization
        if (req.userContext.roleLevel <= permissions_1.RoleLevel.SUPER_ADMIN) {
            return next();
        }
        if (req.userContext.organizationId !== targetOrgId) {
            return res.status(403).json({ message: "Access denied to this organization" });
        }
        next();
    };
};
exports.requireOrganization = requireOrganization;
/**
 * Require user to be in specific department
 */
const requireDepartment = (deptIdParam = "departmentId") => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const targetDeptId = req.params[deptIdParam] || req.body[deptIdParam];
        if (!targetDeptId) {
            return res.status(400).json({ message: "Department ID required" });
        }
        if (!req.userContext) {
            const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["id", "organizationId", "departmentId"]
            });
            const { role } = await loadUserPermissions(req.user.id);
            req.userContext = {
                userId: req.user.id,
                roleLevel: role?.level ?? permissions_1.RoleLevel.GUEST,
                organizationId: user?.organizationId,
                departmentId: user?.departmentId
            };
        }
        // Admins+ can access any department in their org
        if (req.userContext.roleLevel <= permissions_1.RoleLevel.ADMIN) {
            return next();
        }
        if (req.userContext.departmentId !== targetDeptId) {
            return res.status(403).json({ message: "Access denied to this department" });
        }
        next();
    };
};
exports.requireDepartment = requireDepartment;
/**
 * Combined permission check helper for complex scenarios
 */
function hasPermission(permissions, resource, action, check, userContext) {
    return permissions.some(permission => {
        return (0, permissions_1.permissionGrantsAccess)({
            resource: permission.resource,
            action: permission.action,
            scope: permission.scope
        }, {
            resource,
            action,
            ...check
        }, userContext);
    });
}
