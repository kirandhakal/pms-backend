"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const auditLogger_1 = require("../middlewares/auditLogger");
const AuditLog_1 = require("../entities/AuditLog");
const MeetingController_1 = require("../controllers/MeetingController");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const ctrl = new MeetingController_1.MeetingController();
const createMeetingSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid().optional(),
    isPersonal: zod_1.z.boolean().optional(),
    projectId: zod_1.z.string().uuid().optional(),
    channelId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(1).max(255),
    topic: zod_1.z.string().max(100).optional(),
    agenda: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime(),
    durationMins: zod_1.z.number().int().positive().optional(),
    participantIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    visibility: zod_1.z.enum(["PRIVATE", "PUBLIC"]).optional(),
    allowGuestJoin: zod_1.z.boolean().optional(),
});
const updateMeetingSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    topic: zod_1.z.string().max(100).optional(),
    agenda: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    durationMins: zod_1.z.number().int().positive().optional(),
    channelId: zod_1.z.string().uuid().optional(),
    projectId: zod_1.z.string().uuid().optional(),
    visibility: zod_1.z.enum(["PRIVATE", "PUBLIC"]).optional(),
    allowGuestJoin: zod_1.z.boolean().optional(),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});
const addParticipantsSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
const addNoteSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
});
const generateMomSchema = zod_1.z.object({
    summary: zod_1.z.string().min(1),
    decisions: zod_1.z.string().optional(),
    actionItems: zod_1.z
        .array(zod_1.z.object({
        description: zod_1.z.string().min(1),
        assigneeId: zod_1.z.string().uuid().optional(),
        dueDate: zod_1.z.string().optional(),
    }))
        .optional(),
    postToChannel: zod_1.z.boolean().optional(),
    convertActionItemsToTasks: zod_1.z.boolean().optional(),
    projectId: zod_1.z.string().uuid().optional(),
});
const markAttendanceSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    attended: zod_1.z.boolean(),
});
const joinInviteSchema = zod_1.z.object({
    token: zod_1.z.string().min(3).optional(),
    slug: zod_1.z.string().min(3).optional(),
}).refine((d) => d.token || d.slug, { message: "slug or token required" });
router.use(auth_1.authenticate);
router.get("/invites/:token/preview", ctrl.getInvitePreview);
router.post("/join", (0, validate_1.validateBody)(joinInviteSchema), ctrl.joinViaInvite);
router.post("/", (0, validate_1.validateBody)(createMeetingSchema), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.CREATE, resource: "meetings" }), ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.patch("/:id", (0, validate_1.validateBody)(updateMeetingSchema), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.UPDATE, resource: "meetings" }), ctrl.update);
router.patch("/:id/status", (0, validate_1.validateBody)(updateStatusSchema), ctrl.updateStatus);
router.post("/:id/invite-link", ctrl.regenerateInvite);
router.post("/:id/participants", (0, validate_1.validateBody)(addParticipantsSchema), ctrl.addParticipants);
router.delete("/:id/participants/:userId", ctrl.removeParticipant);
router.patch("/:id/attendance", (0, validate_1.validateBody)(markAttendanceSchema), ctrl.markAttendance);
router.post("/:id/notes", (0, validate_1.validateBody)(addNoteSchema), ctrl.addNote);
router.get("/:id/notes", ctrl.getNotes);
router.post("/:id/mom/generate", (0, validate_1.validateBody)(generateMomSchema), (0, auditLogger_1.auditLog)({ action: AuditLog_1.AuditAction.CREATE, resource: "minutes_of_meeting" }), ctrl.generateMom);
router.get("/:id/mom", ctrl.getMom);
exports.default = router;
