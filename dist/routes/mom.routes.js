"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const MeetingController_1 = require("../controllers/MeetingController");
const validate_1 = require("../middlewares/validate");
const auditLogger_1 = require("../middlewares/auditLogger");
const AuditLog_1 = require("../entities/AuditLog");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const ctrl = new MeetingController_1.MeetingController();
const updateMomSchema = zod_1.z.object({
    summary: zod_1.z.string().min(1).optional(),
    decisions: zod_1.z.string().optional(),
});
const addActionItemSchema = zod_1.z.object({
    description: zod_1.z.string().min(1),
    assigneeId: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().optional(),
});
const updateActionItemSchema = zod_1.z.object({
    description: zod_1.z.string().min(1).optional(),
    assigneeId: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().optional(),
    status: zod_1.z.enum(["OPEN", "DONE"]).optional(),
});
const convertToTaskSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
});
router.use(auth_1.authenticate);
// Action-item routes first (more specific than /:momId)
router.patch("/action-items/:actionItemId", (0, validate_1.validateBody)(updateActionItemSchema), ctrl.updateActionItem);
router.post("/action-items/:actionItemId/convert-to-task", (0, validate_1.validateBody)(convertToTaskSchema), (0, auditLogger_1.auditLog)({
    action: AuditLog_1.AuditAction.CREATE,
    resource: "tasks",
    getDescription: () => "Converted MOM action item to task",
}), ctrl.convertToTask);
router.post("/:momId/action-items", (0, validate_1.validateBody)(addActionItemSchema), ctrl.addActionItem);
router.patch("/:momId", (0, validate_1.validateBody)(updateMomSchema), ctrl.updateMom);
exports.default = router;
