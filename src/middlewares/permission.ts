import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { Permission as PermissionEntity } from "../entities/Permission";
import { 
    PermissionResource, 
    PermissionAction, 
    PermissionScope,
    permissionGrantsAccess,
    PermissionCheck,
    RoleLevel
} from "../config/permissions";
import { AuthRequest } from "./auth";

export interface PermissionRequest extends AuthRequest {
    userPermissions?: PermissionEntity[];
    userRole?: Role;
    userContext?: {
        userId: string;
        roleLevel: number;
        organizationId?: string;
        departmentId?: string;
    };
}

/**
 * Cache for user permissions to reduce database queries
 * In production, use Redis for distributed caching
 */
const permissionCache = new Map<string, { permissions: PermissionEntity[]; role: Role; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load user permissions from database or cache
 */
async function loadUserPermissions(userId: string): Promise<{ permissions: PermissionEntity[]; role: Role | null }> {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return { permissions: cached.permissions, role: cached.role };
    }

    const userRepo = AppDataSource.getRepository(User);
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
export function clearPermissionCache(userId: string): void {
    permissionCache.delete(userId);
}

/**
 * Clear entire permission cache
 */
export function clearAllPermissionCache(): void {
    permissionCache.clear();
}

/**
 * Middleware to load user permissions into request
 */
export const loadPermissions = async (req: PermissionRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next();
    }

    try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({
            where: { id: req.user.id },
            select: ["id", "organizationId", "departmentId"]
        });

        const { permissions, role } = await loadUserPermissions(req.user.id);
        
        req.userPermissions = permissions;
        req.userRole = role || undefined;
        req.userContext = {
            userId: req.user.id,
            roleLevel: role?.level ?? RoleLevel.GUEST,
            organizationId: user?.organizationId,
            departmentId: user?.departmentId
        };

        next();
    } catch (error) {
        console.error("Error loading permissions:", error);
        return res.status(500).json({ message: "Failed to load permissions" });
    }
};

/**
 * Permission check middleware factory
 * 
 * @example
 * router.get("/users", authorize(PermissionResource.USERS, PermissionAction.READ), controller)
 */
export const authorize = (resource: PermissionResource, action: PermissionAction) => {
    return async (req: PermissionRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Load permissions if not already loaded
        if (!req.userPermissions) {
            const { permissions, role } = await loadUserPermissions(req.user.id);
            
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["id", "organizationId", "departmentId"]
            });

            req.userPermissions = permissions;
            req.userRole = role || undefined;
            req.userContext = {
                userId: req.user.id,
                roleLevel: role?.level ?? RoleLevel.GUEST,
                organizationId: user?.organizationId,
                departmentId: user?.departmentId
            };
        }

        // Build permission check
        const check: PermissionCheck = {
            resource,
            action,
            targetOrganizationId: (typeof req.params.organizationId === 'string' ? req.params.organizationId : undefined) || req.body.organizationId,
            targetDepartmentId: (typeof req.params.departmentId === 'string' ? req.params.departmentId : undefined) || req.body.departmentId,
            targetOwnerId: typeof req.params.userId === 'string' ? req.params.userId : (typeof req.params.id === 'string' ? req.params.id : undefined)
        };

        // Check if any permission grants access
        const hasPermission = req.userPermissions?.some(permission => {
            return permissionGrantsAccess(
                {
                    resource: permission.resource,
                    action: permission.action,
                    scope: permission.scope
                },
                check,
                {
                    userId: req.userContext!.userId,
                    organizationId: req.userContext!.organizationId,
                    departmentId: req.userContext!.departmentId
                }
            );
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

/**
 * Check minimum role level
 * 
 * @example
 * router.post("/admin-only", requireRoleLevel(RoleLevel.ADMIN), controller)
 */
export const requireRoleLevel = (maxLevel: RoleLevel) => {
    return async (req: PermissionRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!req.userContext) {
            const { role } = await loadUserPermissions(req.user.id);
            req.userContext = {
                userId: req.user.id,
                roleLevel: role?.level ?? RoleLevel.GUEST,
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

/**
 * Require user to be in specific organization
 */
export const requireOrganization = (orgIdParam: string = "organizationId") => {
    return async (req: PermissionRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const targetOrgId = req.params[orgIdParam] || req.body[orgIdParam];
        
        if (!targetOrgId) {
            return res.status(400).json({ message: "Organization ID required" });
        }

        if (!req.userContext) {
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["id", "organizationId", "departmentId"]
            });

            req.userContext = {
                userId: req.user.id,
                roleLevel: RoleLevel.GUEST,
                organizationId: user?.organizationId,
                departmentId: user?.departmentId
            };
        }

        // System/Super admins can access any organization
        if (req.userContext.roleLevel <= RoleLevel.SUPER_ADMIN) {
            return next();
        }

        if (req.userContext.organizationId !== targetOrgId) {
            return res.status(403).json({ message: "Access denied to this organization" });
        }

        next();
    };
};

/**
 * Require user to be in specific department
 */
export const requireDepartment = (deptIdParam: string = "departmentId") => {
    return async (req: PermissionRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const targetDeptId = req.params[deptIdParam] || req.body[deptIdParam];
        
        if (!targetDeptId) {
            return res.status(400).json({ message: "Department ID required" });
        }

        if (!req.userContext) {
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["id", "organizationId", "departmentId"]
            });

            const { role } = await loadUserPermissions(req.user.id);

            req.userContext = {
                userId: req.user.id,
                roleLevel: role?.level ?? RoleLevel.GUEST,
                organizationId: user?.organizationId,
                departmentId: user?.departmentId
            };
        }

        // Admins+ can access any department in their org
        if (req.userContext.roleLevel <= RoleLevel.ADMIN) {
            return next();
        }

        if (req.userContext.departmentId !== targetDeptId) {
            return res.status(403).json({ message: "Access denied to this department" });
        }

        next();
    };
};

/**
 * Combined permission check helper for complex scenarios
 */
export function hasPermission(
    permissions: PermissionEntity[],
    resource: PermissionResource,
    action: PermissionAction,
    check: Partial<PermissionCheck>,
    userContext: { userId: string; organizationId?: string; departmentId?: string }
): boolean {
    return permissions.some(permission => {
        return permissionGrantsAccess(
            {
                resource: permission.resource,
                action: permission.action,
                scope: permission.scope
            },
            {
                resource,
                action,
                ...check
            },
            userContext
        );
    });
}
