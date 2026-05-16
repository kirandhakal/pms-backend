import { Router } from "express";
import { PublicController } from "../controllers/PublicController";

const router = Router();
const publicController = new PublicController();

router.get("/stats", publicController.getStats);
router.get("/features", publicController.getFeatures);

export default router;
