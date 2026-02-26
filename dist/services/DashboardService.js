"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const data_source_1 = require("../config/data-source");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
class DashboardService {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
    }
    async getUserDashboard(userId) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ["id", "fullName", "email", "role", "isActive", "createdAt", "updatedAt"]
        });
        const totalTasks = await this.taskRepo.count({ where: { assignedUser: { id: userId } } });
        const completedTasks = await this.taskRepo.count({
            where: { assignedUser: { id: userId }, status: Task_1.TaskStatus.DONE }
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
        const totalAdmins = await this.userRepo.count({ where: [{ role: User_1.UserRole.ADMIN }, { role: User_1.UserRole.SUPER_ADMIN }] });
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
exports.DashboardService = DashboardService;
