import { Router } from "express";
import { WorklogController } from "../controllers/WorklogController";
import { authenticate } from "../middlewares/auth";
import { loadPermissions, authorize } from "../middlewares/permission";
import { PermissionResource, PermissionAction } from "../config/permissions";

const router = Router();
const worklogController = new WorklogController();

router.use(authenticate);
router.use(loadPermissions);

// Management reports (permission-gated)
router.get(
    "/export",
    authorize(PermissionResource.REPORTS, PermissionAction.EXPORT),
    worklogController.exportExcel
);
router.get(
    "/",
    authorize(PermissionResource.REPORTS, PermissionAction.READ),
    worklogController.listAll
);

// Self-service
router.get("/project/:projectId", worklogController.listByProject);
router.get("/user", worklogController.listByUser);
router.post("/", worklogController.create);
router.post("/confirm-completion", worklogController.confirmCompletion);
router.patch("/:id", worklogController.update);

export default router;
