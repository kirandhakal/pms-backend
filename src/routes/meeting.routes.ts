import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { loadPermissions, authorize } from "../middlewares/permission";
import { resolveTenant, requireTenant } from "../middlewares/tenantResolver";
import { auditLog } from "../middlewares/auditLogger";
import { AuditAction } from "../entities/AuditLog";
import { PermissionResource, PermissionAction } from "../config/permissions";
import { MeetingController } from "../controllers/MeetingController";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";

const router = Router();
const ctrl = new MeetingController();

// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────

const createMeetingSchema = z.object({
    organizationId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    channelId: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    agenda: z.string().optional(),
    scheduledAt: z.string().datetime(),
    durationMins: z.number().int().positive().optional(),
    participantIds: z.array(z.string().uuid()).optional(),
});

const updateMeetingSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    agenda: z.string().optional(),
    scheduledAt: z.string().datetime().optional(),
    durationMins: z.number().int().positive().optional(),
    channelId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
});

const updateStatusSchema = z.object({
    status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

const addParticipantsSchema = z.object({
    userIds: z.array(z.string().uuid()).min(1),
});

const addNoteSchema = z.object({
    content: z.string().min(1),
});

const generateMomSchema = z.object({
    summary: z.string().min(1),
    decisions: z.string().optional(),
    actionItems: z
        .array(
            z.object({
                description: z.string().min(1),
                assigneeId: z.string().uuid().optional(),
                dueDate: z.string().optional(),
            })
        )
        .optional(),
});

const updateMomSchema = z.object({
    summary: z.string().min(1).optional(),
    decisions: z.string().optional(),
});

const addActionItemSchema = z.object({
    description: z.string().min(1),
    assigneeId: z.string().uuid().optional(),
    dueDate: z.string().optional(),
});

const updateActionItemSchema = z.object({
    description: z.string().min(1).optional(),
    assigneeId: z.string().uuid().optional(),
    dueDate: z.string().optional(),
    status: z.enum(["OPEN", "DONE"]).optional(),
});

const convertToTaskSchema = z.object({
    projectId: z.string().uuid(),
});

const markAttendanceSchema = z.object({
    userId: z.string().uuid(),
    attended: z.boolean(),
});

// ──────────────────────────────────────────────
// MEETING CRUD
// ──────────────────────────────────────────────

/**
 * @route   POST /api/meetings
 * @desc    Create a new meeting
 */
router.post(
    "/",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.CREATE),
    validateBody(createMeetingSchema),
    auditLog({ action: AuditAction.CREATE, resource: "meetings" }),
    ctrl.create
);

/**
 * @route   GET /api/meetings
 * @desc    List meetings (query: organizationId, projectId)
 */
router.get(
    "/",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.READ),
    ctrl.list
);

/**
 * @route   GET /api/meetings/:id
 * @desc    Get meeting details
 */
router.get(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.READ),
    ctrl.getById
);

/**
 * @route   PATCH /api/meetings/:id
 * @desc    Update meeting
 */
router.patch(
    "/:id",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(updateMeetingSchema),
    auditLog({ action: AuditAction.UPDATE, resource: "meetings" }),
    ctrl.update
);

/**
 * @route   PATCH /api/meetings/:id/status
 * @desc    Update meeting status
 */
router.patch(
    "/:id/status",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(updateStatusSchema),
    auditLog({
        action: AuditAction.UPDATE,
        resource: "meetings",
        getDescription: (req) => `Meeting status changed to ${req.body.status}`,
    }),
    ctrl.updateStatus
);

// ──────────────────────────────────────────────
// PARTICIPANTS
// ──────────────────────────────────────────────

/**
 * @route   POST /api/meetings/:id/participants
 * @desc    Add participants to a meeting
 */
router.post(
    "/:id/participants",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(addParticipantsSchema),
    ctrl.addParticipants
);

/**
 * @route   DELETE /api/meetings/:id/participants/:userId
 * @desc    Remove a participant from a meeting
 */
router.delete(
    "/:id/participants/:userId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    ctrl.removeParticipant
);

/**
 * @route   PATCH /api/meetings/:id/attendance
 * @desc    Mark attendance for a participant
 */
router.patch(
    "/:id/attendance",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(markAttendanceSchema),
    ctrl.markAttendance
);

// ──────────────────────────────────────────────
// NOTES
// ──────────────────────────────────────────────

/**
 * @route   POST /api/meetings/:id/notes
 * @desc    Add a note to a meeting
 */
router.post(
    "/:id/notes",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(addNoteSchema),
    ctrl.addNote
);

/**
 * @route   GET /api/meetings/:id/notes
 * @desc    Get all notes for a meeting
 */
router.get(
    "/:id/notes",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.READ),
    ctrl.getNotes
);

// ──────────────────────────────────────────────
// MOM (Minutes of Meeting)
// ──────────────────────────────────────────────

/**
 * @route   POST /api/meetings/:id/mom/generate
 * @desc    Generate MOM for a meeting
 */
router.post(
    "/:id/mom/generate",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.CREATE),
    validateBody(generateMomSchema),
    auditLog({ action: AuditAction.CREATE, resource: "minutes_of_meeting" }),
    ctrl.generateMom
);

/**
 * @route   GET /api/meetings/:id/mom
 * @desc    Get MOM for a meeting
 */
router.get(
    "/:id/mom",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.READ),
    ctrl.getMom
);

/**
 * @route   PATCH /api/mom/:momId
 * @desc    Update MOM content
 */
router.patch(
    "/mom/:momId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(updateMomSchema),
    ctrl.updateMom
);

// ──────────────────────────────────────────────
// ACTION ITEMS
// ──────────────────────────────────────────────

/**
 * @route   POST /api/mom/:momId/action-items
 * @desc    Add an action item to a MOM
 */
router.post(
    "/mom/:momId/action-items",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.CREATE),
    validateBody(addActionItemSchema),
    ctrl.addActionItem
);

/**
 * @route   PATCH /api/mom/action-items/:actionItemId
 * @desc    Update an action item
 */
router.patch(
    "/mom/action-items/:actionItemId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.UPDATE),
    validateBody(updateActionItemSchema),
    ctrl.updateActionItem
);

/**
 * @route   POST /api/mom/action-items/:actionItemId/convert-to-task
 * @desc    Convert an action item into a Kanban task
 */
router.post(
    "/mom/action-items/:actionItemId/convert-to-task",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.MEETINGS, PermissionAction.CREATE),
    validateBody(convertToTaskSchema),
    auditLog({ action: AuditAction.CREATE, resource: "tasks", getDescription: () => "Converted MOM action item to task" }),
    ctrl.convertToTask
);

export default router;
