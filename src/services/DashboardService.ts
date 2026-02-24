import { AppDataSource } from "../config/data-source";
import { Task, TaskStatus } from "../entities/Task";
import { User, UserRole } from "../entities/User";

export class DashboardService {
    private userRepo = AppDataSource.getRepository(User);
    private taskRepo = AppDataSource.getRepository(Task);

    async getUserDashboard(userId: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ["id", "fullName", "email", "role", "isActive", "createdAt", "updatedAt"]
        });

        const totalTasks = await this.taskRepo.count({ where: { assignedUser: { id: userId } } });
        const completedTasks = await this.taskRepo.count({
            where: { assignedUser: { id: userId }, status: TaskStatus.DONE }
        });

        return {
            profile: user,
            stats: {
                totalTasks,
                completedTasks,
                pendingTasks: Math.max(totalTasks - completedTasks, 0)
            }
        };
    }

    async getAdminDashboard() {
        const totalUsers = await this.userRepo.count();
        const activeUsers = await this.userRepo.count({ where: { isActive: true } });

        return {
            totalUsers,
            activeUsers,
            inactiveUsers: Math.max(totalUsers - activeUsers, 0)
        };
    }

    async getSuperAdminDashboard() {
        const totalUsers = await this.userRepo.count();
        const totalAdmins = await this.userRepo.count({ where: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }] });
        const activeUsers = await this.userRepo.count({ where: { isActive: true } });

        return {
            totalUsers,
            totalAdmins,
            systemSummary: {
                activeUsers,
                inactiveUsers: Math.max(totalUsers - activeUsers, 0)
            }
        };
    }
}
