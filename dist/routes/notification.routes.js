"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const typeorm_1 = require("typeorm");
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const data_source_1 = require("../config/data-source");
const Notification_1 = require("../entities/Notification");
const User_1 = require("../entities/User");
const NotificationService_1 = require("../services/NotificationService");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get("/preferences", async (req, res) => {
    const user = await data_source_1.AppDataSource.getRepository(User_1.User).findOneByOrFail({ id: req.user.id });
    res.json({ enabled: user.preferences?.notifications !== false, mutedTypes: user.preferences?.mutedNotificationTypes || [], types: NotificationService_1.notificationTypes });
});
router.put("/preferences", async (req, res) => {
    const parsed = zod_1.z.object({ enabled: zod_1.z.boolean(), mutedTypes: zod_1.z.array(zod_1.z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/)).max(100) }).strict().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Provide enabled and up to 100 valid notification type names." });
        return;
    }
    await data_source_1.AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(User_1.User);
        const user = await repo.findOneOrFail({ where: { id: req.user.id }, lock: { mode: "pessimistic_write" } });
        user.preferences = { ...user.preferences, notifications: parsed.data.enabled, mutedNotificationTypes: [...new Set(parsed.data.mutedTypes)] };
        await repo.save(user);
    });
    res.json({ ...parsed.data, types: NotificationService_1.notificationTypes });
});
router.get("/", async (req, res) => {
    const repo = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
    const [items, unreadCount] = await Promise.all([repo.find({ where: { userId: req.user.id }, order: { createdAt: "DESC", id: "DESC" }, take: 50 }), repo.countBy({ userId: req.user.id, readAt: (0, typeorm_1.IsNull)() })]);
    res.json({ items, unreadCount });
});
router.patch("/read-all", async (req, res) => {
    await data_source_1.AppDataSource.getRepository(Notification_1.Notification).update({ userId: req.user.id, readAt: (0, typeorm_1.IsNull)() }, { readAt: new Date() });
    res.json({ success: true });
});
router.patch("/:id/read", async (req, res) => {
    if (!zod_1.z.string().uuid().safeParse(req.params.id).success) {
        res.status(400).json({ message: "Invalid notification ID" });
        return;
    }
    const repo = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
    const item = await repo.findOneBy({ id: String(req.params.id), userId: req.user.id });
    if (!item) {
        res.status(404).json({ message: "Notification not found" });
        return;
    }
    if (!item.readAt) {
        item.readAt = new Date();
        await repo.save(item);
    }
    res.json(item);
});
exports.default = router;
