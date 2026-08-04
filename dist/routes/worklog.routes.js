"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WorklogController_1 = require("../controllers/WorklogController");
const auth_1 = require("../middlewares/auth");
const permission_1 = require("../middlewares/permission");
const permissions_1 = require("../config/permissions");
const router = (0, express_1.Router)();
const worklogController = new WorklogController_1.WorklogController();
router.use(auth_1.authenticate);
router.use(permission_1.loadPermissions);
// Management reports (permission-gated)
router.get("/export", (0, permission_1.authorize)(permissions_1.PermissionResource.REPORTS, permissions_1.PermissionAction.EXPORT), worklogController.exportExcel);
router.get("/", (0, permission_1.authorize)(permissions_1.PermissionResource.REPORTS, permissions_1.PermissionAction.READ), worklogController.listAll);
// Self-service
router.get("/project/:projectId", worklogController.listByProject);
router.get("/user", worklogController.listByUser);
router.post("/", worklogController.create);
router.post("/confirm-completion", worklogController.confirmCompletion);
router.patch("/:id", worklogController.update);
exports.default = router;
