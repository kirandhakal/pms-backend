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

export default router;
