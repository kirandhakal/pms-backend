import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { auditLog } from "../middlewares/auditLogger";
import { AuditAction } from "../entities/AuditLog";
import { MeetingController } from "../controllers/MeetingController";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";

const router = Router();
const ctrl = new MeetingController();

const createMeetingSchema = z.object({
    organizationId: z.string().uuid().optional(),
    isPersonal: z.boolean().optional(),
    projectId: z.string().uuid().optional(),
    channelId: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    topic: z.string().max(100).optional(),
    agenda: z.string().optional(),
    scheduledAt: z.string().datetime(),
    durationMins: z.number().int().positive().optional(),
    participantIds: z.array(z.string().uuid()).optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
    allowGuestJoin: z.boolean().optional(),
});

const updateMeetingSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    topic: z.string().max(100).optional(),
    agenda: z.string().optional(),
    scheduledAt: z.string().datetime().optional(),
    durationMins: z.number().int().positive().optional(),
    channelId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
    allowGuestJoin: z.boolean().optional(),
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
    postToChannel: z.boolean().optional(),
    convertActionItemsToTasks: z.boolean().optional(),
    projectId: z.string().uuid().optional(),
});

const markAttendanceSchema = z.object({
    userId: z.string().uuid(),
    attended: z.boolean(),
});

const joinInviteSchema = z.object({
    token: z.string().min(3).optional(),
    slug: z.string().min(3).optional(),
}).refine((d) => d.token || d.slug, { message: "slug or token required" });

router.use(authenticate);

router.get("/invites/:token/preview", ctrl.getInvitePreview);
router.post("/join", validateBody(joinInviteSchema), ctrl.joinViaInvite);

router.post(
    "/",
    validateBody(createMeetingSchema),
    auditLog({ action: AuditAction.CREATE, resource: "meetings" }),
    ctrl.create
);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);

router.patch(
    "/:id",
    validateBody(updateMeetingSchema),
    auditLog({ action: AuditAction.UPDATE, resource: "meetings" }),
    ctrl.update
);

router.patch(
    "/:id/status",
    validateBody(updateStatusSchema),
    ctrl.updateStatus
);

router.post(
    "/:id/invite-link",
    ctrl.regenerateInvite
);

router.post(
    "/:id/participants",
    validateBody(addParticipantsSchema),
    ctrl.addParticipants
);

router.delete("/:id/participants/:userId", ctrl.removeParticipant);

router.patch(
    "/:id/attendance",
    validateBody(markAttendanceSchema),
    ctrl.markAttendance
);

router.post("/:id/notes", validateBody(addNoteSchema), ctrl.addNote);
router.get("/:id/notes", ctrl.getNotes);

router.post(
    "/:id/mom/generate",
    validateBody(generateMomSchema),
    auditLog({ action: AuditAction.CREATE, resource: "minutes_of_meeting" }),
    ctrl.generateMom
);

router.get("/:id/mom", ctrl.getMom);

export default router;
