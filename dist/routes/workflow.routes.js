"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const permission_1 = require("../middlewares/permission");
const tenantResolver_1 = require("../middlewares/tenantResolver");
const auditLogger_1 = require("../middlewares/auditLogger");
const AuditLog_1 = require("../entities/AuditLog");
const permissions_1 = require("../config/permissions");
const WorkflowEngine_1 = require("../services/WorkflowEngine");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const createWorkflowSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().max(500).optional(),
    settings: zod_1.z.object({
        allowBackwardTransition: zod_1.z.boolean().optional(),
        requireAssignee: zod_1.z.boolean().optional(),
        autoAssignOnCreate: zod_1.z.boolean().optional(),
        notifyOnStageChange: zod_1.z.boolean().optional()
    }).optional(),
    stages: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1).max(50),
        order: zod_1.z.number().optional(),
        color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        isDefault: zod_1.z.boolean().optional(),
        isFinal: zod_1.z.boolean().optional()
    })).optional()
});
const createStageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    order: zod_1.z.number().optional(),
    color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    settings: zod_1.z.object({
        autoAssignTo: zod_1.z.string().uuid().optional(),
        requireApproval: zod_1.z.boolean().optional(),
        maxWipLimit: zod_1.z.number().positive().optional(),
        slaHours: zod_1.z.number().positive().optional()
    }).optional()
});
const updateStageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50).optional(),
    order: zod_1.z.number().optional(),
    color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    isDefault: zod_1.z.boolean().optional(),
    isFinal: zod_1.z.boolean().optional()
});
const reorderStagesSchema = zod_1.z.object({
    stages: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        order: zod_1.z.number()
    }))
});
/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Admin+
 */
router.post("/", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, tenantResolver_1.requireTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.CREATE), (0, validate_1.validateBody)(createWorkflowSchema), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.CREATE, resource: "workflows" }), async (req, res, next) => {
    try {
        const workflow = await WorkflowEngine_1.workflowEngine.createWorkflow({
            ...req.body,
            organizationId: req.tenant.organizationId,
            createdById: req.user.id
        });
        res.status(201).json({
            message: "Workflow created successfully",
            data: workflow
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/workflows
 * @desc    List workflows for organization
 * @access  Member+
 */
router.get("/", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, tenantResolver_1.requireTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const workflows = await WorkflowEngine_1.workflowEngine.getWorkflowsByOrganization(req.tenant.organizationId);
        res.json({ data: workflows });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/workflows/default
 * @desc    Get or create default workflow
 * @access  Member+
 */
router.get("/default", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, tenantResolver_1.requireTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const workflow = await WorkflowEngine_1.workflowEngine.getOrCreateDefaultWorkflow(req.tenant.organizationId, req.user.id);
        res.json({ data: workflow });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/workflows/:id
 * @desc    Get workflow details with stages
 * @access  Member+
 */
router.get("/:id", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const workflow = await WorkflowEngine_1.workflowEngine.getWorkflowById(String(req.params.id));
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        res.json({ data: workflow });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/workflows/:id/stats
 * @desc    Get workflow statistics
 * @access  Member+
 */
router.get("/:id/stats", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const stats = await WorkflowEngine_1.workflowEngine.getWorkflowStats(String(req.params.id));
        res.json({ data: stats });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/workflows/:id/stages
 * @desc    Add stage to workflow
 * @access  Admin+
 */
router.post("/:id/stages", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(createStageSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.UPDATE,
    resource: "workflow_stages",
    getDescription: () => "Added new stage to workflow"
}), async (req, res, next) => {
    try {
        const stage = await WorkflowEngine_1.workflowEngine.addStage(String(String(req.params.id)), req.body);
        res.status(201).json({
            message: "Stage added successfully",
            data: stage
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/workflows/:id/stages/:stageId
 * @desc    Update workflow stage
 * @access  Admin+
 */
router.put("/:id/stages/:stageId", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(updateStageSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.UPDATE,
    resource: "workflow_stages",
    getResourceId: (req) => String(req.params.stageId)
}), async (req, res, next) => {
    try {
        const stage = await WorkflowEngine_1.workflowEngine.updateStage(String(String(req.params.stageId)), req.body);
        res.json({
            message: "Stage updated successfully",
            data: stage
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/workflows/:id/stages/:stageId
 * @desc    Delete workflow stage
 * @access  Admin+
 */
router.delete("/:id/stages/:stageId", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.DELETE,
    resource: "workflow_stages",
    getResourceId: (req) => String(req.params.stageId)
}), async (req, res, next) => {
    try {
        await WorkflowEngine_1.workflowEngine.deleteStage(String(req.params.stageId));
        res.json({ message: "Stage deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/workflows/:id/stages/reorder
 * @desc    Reorder workflow stages
 * @access  Admin+
 */
router.put("/:id/stages/reorder", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(reorderStagesSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.UPDATE,
    resource: "workflow_stages",
    getDescription: () => "Reordered workflow stages"
}), async (req, res, next) => {
    try {
        const stages = await WorkflowEngine_1.workflowEngine.reorderStages(String(String(req.params.id)), req.body.stages);
        res.json({
            message: "Stages reordered successfully",
            data: stages
        });
    }
    catch (error) {
        next(error);
    }
});
// ──────────────────────────────────────────────
// STAGE VISIBILITY
// ──────────────────────────────────────────────
const updateVisibilitySchema = zod_1.z.object({
    visibility: zod_1.z.enum(["TEAM_ONLY", "PROJECT_WIDE"]),
});
const addStageMembersSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
/**
 * @route   PATCH /api/workflows/:workflowId/stages/:stageId/visibility
 * @desc    Set stage visibility (TEAM_ONLY | PROJECT_WIDE)
 * @access  Admin+
 */
router.patch("/:workflowId/stages/:stageId/visibility", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(updateVisibilitySchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.UPDATE,
    resource: "workflow_stages",
    getResourceId: (req) => String(req.params.stageId),
    getDescription: (req) => `Stage visibility set to ${req.body.visibility}`,
}), async (req, res, next) => {
    try {
        const stage = await WorkflowEngine_1.workflowEngine.updateStageVisibility(String(req.params.stageId), req.body.visibility);
        res.json({ message: "Stage visibility updated", data: stage });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/workflows/:workflowId/stages/:stageId/members
 * @desc    Add members to a stage (for TEAM_ONLY visibility)
 * @access  Admin+
 */
router.post("/:workflowId/stages/:stageId/members", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), (0, validate_1.validateBody)(addStageMembersSchema), async (req, res, next) => {
    try {
        const members = await WorkflowEngine_1.workflowEngine.addStageMembers(String(req.params.stageId), req.body.userIds);
        res.status(201).json({ message: "Stage members added", data: members });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/workflows/:workflowId/stages/:stageId/members/:userId
 * @desc    Remove a member from a stage
 * @access  Admin+
 */
router.delete("/:workflowId/stages/:stageId/members/:userId", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.UPDATE), async (req, res, next) => {
    try {
        await WorkflowEngine_1.workflowEngine.removeStageMember(String(req.params.stageId), String(req.params.userId));
        res.json({ message: "Stage member removed" });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/workflows/:workflowId/stages/:stageId/members
 * @desc    List members of a stage
 * @access  Member+
 */
router.get("/:workflowId/stages/:stageId/members", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        const members = await WorkflowEngine_1.workflowEngine.getStageMembers(String(req.params.stageId));
        res.json({ data: members });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/workflows/:id/visible-stages
 * @desc    Get stages visible to the current user (respects TEAM_ONLY visibility)
 * @access  Member+
 */
router.get("/:id/visible-stages", auth_1.authenticate, permission_1.loadPermissions, tenantResolver_1.resolveTenant, (0, permission_1.authorize)(permissions_1.PermissionResource.WORKFLOWS, permissions_1.PermissionAction.READ), async (req, res, next) => {
    try {
        // Elevated roles can see all stages
        const isElevated = (req.userContext?.roleLevel ?? 99) <= 3; // DEPARTMENT_HEAD and above
        const stages = await WorkflowEngine_1.workflowEngine.getVisibleStagesForUser(String(req.params.id), req.user.id, isElevated);
        res.json({ data: stages });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
