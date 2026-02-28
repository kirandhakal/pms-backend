"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const project_routes_1 = __importDefault(require("./project.routes"));
const task_routes_1 = __importDefault(require("./task.routes"));
const invite_routes_1 = __importDefault(require("./invite.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const public_routes_1 = __importDefault(require("./public.routes"));
const organization_routes_1 = __importDefault(require("./organization.routes"));
const workflow_routes_1 = __importDefault(require("./workflow.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const router = (0, express_1.Router)();
// Public routes (no auth required)
router.use("/public", public_routes_1.default);
// Authentication routes
router.use("/auth", auth_routes_1.default);
// Protected routes
router.use("/organizations", organization_routes_1.default);
router.use("/workflows", workflow_routes_1.default);
router.use("/roles", role_routes_1.default);
router.use("/projects", project_routes_1.default);
router.use("/tasks", task_routes_1.default);
router.use("/invites", invite_routes_1.default);
router.use("/users", user_routes_1.default);
router.use("/dashboard", dashboard_routes_1.default);
exports.default = router;
