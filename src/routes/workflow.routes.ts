import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { authorize, loadPermissions } from "../middlewares/permission";
import { resolveTenant, requireTenant } from "../middlewares/tenantResolver";
import { auditLog } from "../middlewares/auditLogger";
import { AuditAction } from "../entities/AuditLog";
import { PermissionResource, PermissionAction } from "../config/permissions";
import { workflowEngine } from "../services/WorkflowEngine";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";
import { TenantRequest } from "../middlewares/tenantResolver";

const router = Router();

// Validation schemas
const createWorkflowSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    settings: z.object({
        allowBackwardTransition: z.boolean().optional(),
        requireAssignee: z.boolean().optional(),
        autoAssignOnCreate: z.boolean().optional(),
        notifyOnStageChange: z.boolean().optional()
    }).optional(),
    stages: z.array(z.object({
        name: z.string().min(1).max(50),
        order: z.number().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        isDefault: z.boolean().optional(),
        isFinal: z.boolean().optional()
    })).optional()
});

const createStageSchema = z.object({
    name: z.string().min(1).max(50),
    order: z.number().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    settings: z.object({
        autoAssignTo: z.string().uuid().optional(),
        requireApproval: z.boolean().optional(),
        maxWipLimit: z.number().positive().optional(),
        slaHours: z.number().positive().optional()
    }).optional()
});

const updateStageSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    order: z.number().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    isDefault: z.boolean().optional(),
    isFinal: z.boolean().optional()
});

const reorderStagesSchema = z.object({
    stages: z.array(z.object({
        id: z.string().uuid(),
        order: z.number()
    }))
});

/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Admin+
 */
router.post(
    "/",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.CREATE),
    validateBody(createWorkflowSchema),
    auditLog({ action: AuditAction.CREATE, resource: "workflows" }),
    async (req: TenantRequest, res, next) => {
        try {
            const workflow = await workflowEngine.createWorkflow({
                ...req.body,
                organizationId: req.tenant!.organizationId,
                createdById: req.user!.id
            });

            res.status(201).json({
                message: "Workflow created successfully",
                data: workflow
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/workflows
 * @desc    List workflows for organization
 * @access  Member+
 */
router.get(
    "/",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.READ),
    async (req: TenantRequest, res, next) => {
        try {
            const workflows = await workflowEngine.getWorkflowsByOrganization(
                req.tenant!.organizationId
            );

            res.json({ data: workflows });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/workflows/default
 * @desc    Get or create default workflow
 * @access  Member+
 */
router.get(
    "/default",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.READ),
    async (req: TenantRequest, res, next) => {
        try {
            const workflow = await workflowEngine.getOrCreateDefaultWorkflow(
                req.tenant!.organizationId,
                req.user!.id
            );

            res.json({ data: workflow });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/workflows/:id
 * @desc    Get workflow details with stages
 * @access  Member+
 */
router.get(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const workflow = await workflowEngine.getWorkflowById(String(req.params.id));

            if (!workflow) {
                return res.status(404).json({ message: "Workflow not found" });
            }

            res.json({ data: workflow });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/workflows/:id/stats
 * @desc    Get workflow statistics
 * @access  Member+
 */
router.get(
    "/:id/stats",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const stats = await workflowEngine.getWorkflowStats(String(req.params.id));
            res.json({ data: stats });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   POST /api/workflows/:id/stages
 * @desc    Add stage to workflow
 * @access  Admin+
 */
router.post(
    "/:id/stages",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    validateBody(createStageSchema),
    auditLog({
        action: AuditAction.UPDATE,
        resource: "workflow_stages",
        getDescription: () => "Added new stage to workflow"
    }),
    async (req, res, next) => {
        try {
            const stage = await workflowEngine.addStage(String(String(req.params.id)), req.body);

            res.status(201).json({
                message: "Stage added successfully",
                data: stage
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   PUT /api/workflows/:id/stages/:stageId
 * @desc    Update workflow stage
 * @access  Admin+
 */
router.put(
    "/:id/stages/:stageId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    validateBody(updateStageSchema),
    auditLog({
        action: AuditAction.UPDATE,
        resource: "workflow_stages",
        getResourceId: (req) => String(req.params.stageId)
    }),
    async (req, res, next) => {
        try {
            const stage = await workflowEngine.updateStage(String(String(req.params.stageId)), req.body);

            res.json({
                message: "Stage updated successfully",
                data: stage
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   DELETE /api/workflows/:id/stages/:stageId
 * @desc    Delete workflow stage
 * @access  Admin+
 */
router.delete(
    "/:id/stages/:stageId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    auditLog({
        action: AuditAction.DELETE,
        resource: "workflow_stages",
        getResourceId: (req) => String(req.params.stageId)
    }),
    async (req, res, next) => {
        try {
            await workflowEngine.deleteStage(String(req.params.stageId));
            res.json({ message: "Stage deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   PUT /api/workflows/:id/stages/reorder
 * @desc    Reorder workflow stages
 * @access  Admin+
 */
router.put(
    "/:id/stages/reorder",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    validateBody(reorderStagesSchema),
    auditLog({
        action: AuditAction.UPDATE,
        resource: "workflow_stages",
        getDescription: () => "Reordered workflow stages"
    }),
    async (req, res, next) => {
        try {
            const stages = await workflowEngine.reorderStages(
                String(String(req.params.id)),
                req.body.stages
            );

            res.json({
                message: "Stages reordered successfully",
                data: stages
            });
        } catch (error) {
            next(error);
        }
    }
);

// ──────────────────────────────────────────────
// STAGE VISIBILITY
// ──────────────────────────────────────────────

const updateVisibilitySchema = z.object({
    visibility: z.enum(["TEAM_ONLY", "PROJECT_WIDE"]),
});

const addStageMembersSchema = z.object({
    userIds: z.array(z.string().uuid()).min(1),
});

/**
 * @route   PATCH /api/workflows/:workflowId/stages/:stageId/visibility
 * @desc    Set stage visibility (TEAM_ONLY | PROJECT_WIDE)
 * @access  Admin+
 */
router.patch(
    "/:workflowId/stages/:stageId/visibility",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    validateBody(updateVisibilitySchema),
    auditLog({
        action: AuditAction.UPDATE,
        resource: "workflow_stages",
        getResourceId: (req) => String(req.params.stageId),
        getDescription: (req) => `Stage visibility set to ${req.body.visibility}`,
    }),
    async (req, res, next) => {
        try {
            const stage = await workflowEngine.updateStageVisibility(
                String(req.params.stageId),
                req.body.visibility
            );
            res.json({ message: "Stage visibility updated", data: stage });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   POST /api/workflows/:workflowId/stages/:stageId/members
 * @desc    Add members to a stage (for TEAM_ONLY visibility)
 * @access  Admin+
 */
router.post(
    "/:workflowId/stages/:stageId/members",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    validateBody(addStageMembersSchema),
    async (req, res, next) => {
        try {
            const members = await workflowEngine.addStageMembers(
                String(req.params.stageId),
                req.body.userIds
            );
            res.status(201).json({ message: "Stage members added", data: members });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   DELETE /api/workflows/:workflowId/stages/:stageId/members/:userId
 * @desc    Remove a member from a stage
 * @access  Admin+
 */
router.delete(
    "/:workflowId/stages/:stageId/members/:userId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.UPDATE),
    async (req, res, next) => {
        try {
            await workflowEngine.removeStageMember(
                String(req.params.stageId),
                String(req.params.userId)
            );
            res.json({ message: "Stage member removed" });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/workflows/:workflowId/stages/:stageId/members
 * @desc    List members of a stage
 * @access  Member+
 */
router.get(
    "/:workflowId/stages/:stageId/members",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.READ),
    async (req, res, next) => {
        try {
            const members = await workflowEngine.getStageMembers(
                String(req.params.stageId)
            );
            res.json({ data: members });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route   GET /api/workflows/:id/visible-stages
 * @desc    Get stages visible to the current user (respects TEAM_ONLY visibility)
 * @access  Member+
 */
router.get(
    "/:id/visible-stages",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.WORKFLOWS, PermissionAction.READ),
    async (req: TenantRequest, res, next) => {
        try {
            // Elevated roles can see all stages
            const isElevated = (req.userContext?.roleLevel ?? 99) <= 3; // DEPARTMENT_HEAD and above

            const stages = await workflowEngine.getVisibleStagesForUser(
                String(req.params.id),
                req.user!.id,
                isElevated
            );
            res.json({ data: stages });
        } catch (error) {
            next(error);
        }
    }
);

export default router;

