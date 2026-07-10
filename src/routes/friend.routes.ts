import { Router } from "express";
import { FriendController } from "../controllers/FriendController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const friendController = new FriendController();

router.use(authenticate);

router.get("/search", friendController.search);
router.get("/", friendController.listFriends);
router.get("/pending", friendController.listPending);
router.post("/request", friendController.sendRequest);
router.put("/request/:id", friendController.respond);
router.get("/dm/:userId", friendController.getConversation);
router.post("/dm", friendController.sendMessage);
router.put("/dm/mute", friendController.setMute);

export default router;
