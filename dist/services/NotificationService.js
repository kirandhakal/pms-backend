"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationTypes = void 0;
exports.notifyUser = notifyUser;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const Notification_1 = require("../entities/Notification");
exports.notificationTypes = ["task.assigned", "task.updated", "meeting.invited", "message.received"];
async function notifyUser(userId, type, title, body) {
    const user = await data_source_1.AppDataSource.getRepository(User_1.User).findOneBy({ id: userId });
    if (!user || user.preferences?.notifications === false || user.preferences?.mutedNotificationTypes?.includes(type))
        return;
    const repo = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
    return repo.save(repo.create({ userId, type, title, body }));
}
