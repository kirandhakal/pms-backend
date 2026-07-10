import { Router } from "express";
import { WorklogController } from "../controllers/WorklogController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const worklogController = new WorklogController();

router.use(authenticate);

router.get("/project/:projectId", worklogController.listByProject);
router.get("/user", worklogController.listByUser);
router.post("/", worklogController.create);

export default router;
