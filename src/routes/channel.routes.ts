import { Router } from "express";
import { ChannelController } from "../controllers/ChannelController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const channelController = new ChannelController();

router.use(authenticate);

router.get("/", channelController.list);
router.post("/", channelController.create);
router.post("/:id/join", channelController.join);
router.get("/:id/messages", channelController.getMessages);
router.post("/:id/messages", channelController.sendMessage);
router.delete("/:id/messages/:messageId", channelController.deleteMessage);
router.put("/:id/mute", channelController.setMute);

export default router;
