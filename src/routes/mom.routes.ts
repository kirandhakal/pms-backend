import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { MeetingController } from "../controllers/MeetingController";
import { validateBody } from "../middlewares/validate";
import { auditLog } from "../middlewares/auditLogger";
import { AuditAction } from "../entities/AuditLog";
import { z } from "zod";

const router = Router();
const ctrl = new MeetingController();

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

router.use(authenticate);

// Action-item routes first (more specific than /:momId)
router.patch(
    "/action-items/:actionItemId",
    validateBody(updateActionItemSchema),
    ctrl.updateActionItem
);

router.post(
    "/action-items/:actionItemId/convert-to-task",
    validateBody(convertToTaskSchema),
    auditLog({
        action: AuditAction.CREATE,
        resource: "tasks",
        getDescription: () => "Converted MOM action item to task",
    }),
    ctrl.convertToTask
);

router.post(
    "/:momId/action-items",
    validateBody(addActionItemSchema),
    ctrl.addActionItem
);

router.patch("/:momId", validateBody(updateMomSchema), ctrl.updateMom);

export default router;
