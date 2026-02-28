import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { authorize, requireRoleLevel, loadPermissions } from "../middlewares/permission";
import { resolveTenant, requireTenant, TenantRequest } from "../middlewares/tenantResolver";
import { auditLog, AuditService } from "../middlewares/auditLogger";
import { AuditAction } from "../entities/AuditLog";
import { PermissionResource, PermissionAction, RoleLevel } from "../config/permissions";
import { organizationService } from "../services/OrganizationService";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";

const router = Router();

// Validation schemas
const createOrganizationSchema = z.object({
    name: z.string().min(2).max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(500).optional(),
    settings: z.object({
        features: z.object({
            guestAccess: z.boolean().optional(),
            departmentVisibility: z.boolean().optional(),
            auditLogging: z.boolean().optional()
        }).optional(),
        limits: z.object({
            maxUsers: z.number().optional(),
            maxDepartments: z.number().optional(),
            maxWorkflows: z.number().optional()
        }).optional()
    }).optional()
});

const updateOrganizationSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    settings: z.object({}).passthrough().optional(),
    isActive: z.boolean().optional()
});

/**
 * @route   POST /api/organizations
 * @desc    Create a new organization
 * @access  SuperAdmin+
 */
router.post(
    "/",
    authenticate,
    loadPermissions,
    requireRoleLevel(RoleLevel.SUPER_ADMIN),
    authorize(PermissionResource.ORGANIZATIONS, PermissionAction.CREATE),
    validateBody(createOrganizationSchema),
    auditLog({ action: AuditAction.CREATE, resource: "organizations" }),
    async (req: TenantRequest, res: Response, next: NextFunction) => {
        try {
            const organization = await organizationService.createOrganization({
                ...req.body,
                ownerId: req.user?.id
            });

            res.status(201).json({
                message: "Organization created successfully",
                data: organization
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/organizations
 * @desc    List all organizations
 * @access  SuperAdmin+
 */
router.get(
    "/",
    authenticate,
    loadPermissions,
    requireRoleLevel(RoleLevel.SUPER_ADMIN),
    authorize(PermissionResource.ORGANIZATIONS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const { isActive, search, page, limit } = req.query;

            const result = await organizationService.listOrganizations({
                isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
                search: search as string,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 20
            });

            res.json({
                data: result.organizations,
                pagination: {
                    total: result.total,
                    page: page ? parseInt(page as string) : 1,
                    limit: limit ? parseInt(limit as string) : 20,
                    pages: Math.ceil(result.total / (limit ? parseInt(limit as string) : 20))
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization details
 * @access  Admin+
 */
router.get(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.ORGANIZATIONS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const includeRelations = req.query.include === "full";
            const organization = await organizationService.getOrganizationById(
                String(String(req.params.id)),
                includeRelations
            );

            if (!organization) {
                return res.status(404).json({ message: "Organization not found" });
            }

            res.json({ data: organization });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Admin+
 */
router.put(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.ORGANIZATIONS, PermissionAction.UPDATE),
    validateBody(updateOrganizationSchema),
    auditLog({ 
        action: AuditAction.UPDATE, 
        resource: "organizations",
        getResourceId: (req) => String(req.params.id)
    }),
    async (req, res, next) => {
        try {
            const organization = await organizationService.updateOrganization(
                String(String(req.params.id)),
                req.body
            );

            res.json({
                message: "Organization updated successfully",
                data: organization
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Delete organization (soft delete)
 * @access  SuperAdmin+
 */
router.delete(
    "/:id",
    authenticate,
    loadPermissions,
    requireRoleLevel(RoleLevel.SUPER_ADMIN),
    authorize(PermissionResource.ORGANIZATIONS, PermissionAction.DELETE),
    auditLog({ 
        action: AuditAction.DELETE, 
        resource: "organizations",
        getResourceId: (req) => String(req.params.id)
    }),
    async (req, res, next) => {
        try {
            await organizationService.deleteOrganization(String(req.params.id));
            res.json({ message: "Organization deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/organizations/:id/stats
 * @desc    Get organization statistics
 * @access  Admin+
 */
router.get(
    "/:id/stats",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.ORGANIZATIONS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const stats = await organizationService.getOrganizationStats(String(req.params.id));
            res.json({ data: stats });
        } catch (error) {
            next(error);
        }
    }
);

// ==================== Department Sub-routes ====================

/**
 * @route   POST /api/organizations/:organizationId/departments
 * @desc    Create department in organization
 * @access  Admin+
 */
router.post(
    "/:organizationId/departments",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.DEPARTMENTS, PermissionAction.CREATE),
    auditLog({ action: AuditAction.CREATE, resource: "departments" }),
    async (req, res, next) => {
        try {
            const department = await organizationService.createDepartment({
                ...req.body,
                organizationId: req.params.organizationId
            });

            res.status(201).json({
                message: "Department created successfully",
                data: department
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/organizations/:organizationId/departments
 * @desc    List departments in organization
 * @access  Member+
 */
router.get(
    "/:organizationId/departments",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.DEPARTMENTS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const { includeInvisible, includeMembers } = req.query;

            const departments = await organizationService.listDepartments(
                String(req.params.organizationId),
                {
                    includeInvisible: includeInvisible === "true",
                    includeMembers: includeMembers === "true"
                }
            );

            res.json({ data: departments });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
