import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Organization } from "../entities/Organization";
import { PermissionRequest } from "./permission";

export interface TenantRequest extends PermissionRequest {
    tenant?: {
        organizationId: string;
        organization?: Organization;
    };
}

/**
 * Resolve tenant context from request
 * Priority: Header > Path param > User's organization
 */
export const resolveTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
        let organizationId: string | undefined;

        // 1. Check X-Organization-Id header (for multi-org users)
        const headerOrgId = req.headers["x-organization-id"] as string;
        if (headerOrgId) {
            organizationId = headerOrgId;
        }

        // 2. Check path parameter
        if (!organizationId && req.params.organizationId && typeof req.params.organizationId === 'string') {
            organizationId = req.params.organizationId;
        }

        // 3. Fall back to user's organization
        if (!organizationId && req.user) {
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["organizationId"]
            });
            organizationId = user?.organizationId;
        }

        if (organizationId) {
            const orgRepo = AppDataSource.getRepository(Organization);
            const organization = await orgRepo.findOne({
                where: { id: organizationId, isActive: true }
            });

            if (organization) {
                req.tenant = {
                    organizationId,
                    organization
                };
            }
        }

        next();
    } catch (error) {
        console.error("Error resolving tenant:", error);
        next();
    }
};

/**
 * Require tenant context - fails if no organization is resolved
 */
export const requireTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant?.organizationId) {
        return res.status(400).json({ 
            message: "Organization context required",
            hint: "Provide X-Organization-Id header or organizationId in request"
        });
    }
    next();
};

/**
 * Validate user has access to the resolved tenant
 */
export const validateTenantAccess = async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.tenant) {
        return next();
    }

    // System admins can access any tenant
    if (req.userContext && req.userContext.roleLevel <= 1) {
        return next();
    }

    // Verify user belongs to this organization
    if (req.userContext?.organizationId !== req.tenant.organizationId) {
        return res.status(403).json({ 
            message: "Access denied to this organization"
        });
    }

    next();
};
