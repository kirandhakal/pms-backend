import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Notification } from "../entities/Notification";
export const notificationTypes = ["task.assigned", "task.updated", "meeting.invited", "message.received"];
export async function notifyUser(userId: string, type: string, title: string, body: string) {
 const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
 if (!user || user.preferences?.notifications === false || user.preferences?.mutedNotificationTypes?.includes(type)) return;
 const repo = AppDataSource.getRepository(Notification);
 return repo.save(repo.create({ userId, type, title, body }));
}
