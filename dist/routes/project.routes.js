"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProjectController_1 = require("../controllers/ProjectController");
const auth_1 = require("../middlewares/auth");
const User_1 = require("../entities/User");
const router = (0, express_1.Router)();
const projectController = new ProjectController_1.ProjectController();
router.use(auth_1.authenticate);
router.post("/", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), projectController.create);
router.get("/", projectController.getAll);
// Restricted Dashboard
router.get("/dashboard", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), projectController.getDashboard);
exports.default = router;
