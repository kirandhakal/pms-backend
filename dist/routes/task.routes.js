"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TaskController_1 = require("../controllers/TaskController");
const auth_1 = require("../middlewares/auth");
const User_1 = require("../entities/User");
const router = (0, express_1.Router)();
const taskController = new TaskController_1.TaskController();
router.use(auth_1.authenticate);
router.post("/", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), taskController.create);
router.patch("/:taskId/status", taskController.updateStatus);
// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
router.get("/progress/:userId", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), taskController.getIndividualProgress);
exports.default = router;
