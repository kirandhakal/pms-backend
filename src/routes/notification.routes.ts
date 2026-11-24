import { Router } from "express";
import { IsNull } from "typeorm";
import { z } from "zod";
import { authenticate } from "../middlewares/auth";
import { AppDataSource } from "../config/data-source";
import { Notification } from "../entities/Notification";
import { User } from "../entities/User";
import { notificationTypes } from "../services/NotificationService";
const router = Router();
router.use(authenticate);
router.get("/preferences", async (req, res) => {
 const user = await AppDataSource.getRepository(User).findOneByOrFail({ id: req.user!.id });
 res.json({ enabled: user.preferences?.notifications !== false, mutedTypes: user.preferences?.mutedNotificationTypes || [], types: notificationTypes });
});
router.put("/preferences", async (req, res) => {
 const parsed = z.object({ enabled: z.boolean(), mutedTypes: z.array(z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/)).max(100) }).strict().safeParse(req.body);
 if (!parsed.success) { res.status(400).json({ message: "Provide enabled and up to 100 valid notification type names." }); return; }
 await AppDataSource.transaction(async manager => {
  const repo = manager.getRepository(User);
  const user = await repo.findOneOrFail({ where: { id: req.user!.id }, lock: { mode: "pessimistic_write" } });
  user.preferences = { ...user.preferences, notifications: parsed.data.enabled, mutedNotificationTypes: [...new Set(parsed.data.mutedTypes)] };
  await repo.save(user);
 });
 res.json({ ...parsed.data, types: notificationTypes });
});
router.get("/", async (req, res) => {
 const repo = AppDataSource.getRepository(Notification);
 const [items, unreadCount] = await Promise.all([repo.find({ where: { userId: req.user!.id }, order: { createdAt: "DESC", id: "DESC" }, take: 50 }), repo.countBy({ userId: req.user!.id, readAt: IsNull() })]);
 res.json({ items, unreadCount });
});
router.patch("/read-all", async (req, res) => {
 await AppDataSource.getRepository(Notification).update({ userId: req.user!.id, readAt: IsNull() }, { readAt: new Date() });
 res.json({ success: true });
});
router.patch("/:id/read", async (req, res) => {
 if (!z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ message: "Invalid notification ID" }); return; }
 const repo = AppDataSource.getRepository(Notification);
 const item = await repo.findOneBy({ id: String(req.params.id), userId: req.user!.id });
 if (!item) { res.status(404).json({ message: "Notification not found" }); return; }
 if (!item.readAt) { item.readAt = new Date(); await repo.save(item); }
 res.json(item);
});
export default router;
