import { Router } from "express";
import { BoardController } from "../controllers/BoardController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const boardController = new BoardController();

router.use(authenticate);

router.post("/", boardController.create);
router.get("/project/:projectId", boardController.getByProject);
router.delete("/:id", boardController.delete);

export default router;
