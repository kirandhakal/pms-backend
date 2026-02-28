import { AppDataSource } from "../config/data-source";
import { Task, TaskStatus, TaskPriority } from "../entities/Task";
import { User, UserRole } from "../entities/User";
import { Project } from "../entities/Project";
import { Organization } from "../entities/Organization";
import { Department } from "../entities/Department";
import { Workflow } from "../entities/Workflow";
import { AuditLog } from "../entities/AuditLog";
import { LessThan, MoreThan, Between, In } from "typeorm";

export class DashboardService {
    private userRepo = AppDataSource.getRepository(User);
    private taskRepo = AppDataSource.getRepository(Task);
    private projectRepo = AppDataSource.getRepository(Project);
    private orgRepo = AppDataSource.getRepository(Organization);
    private deptRepo = AppDataSource.getRepository(Department);
    private workflowRepo = AppDataSource.getRepository(Workflow);
    private auditRepo = AppDataSource.getRepository(AuditLog);

    // Helper to get date range for trends
    private getDateRange(days: number) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        return { start, end };
    }

    // Get recent activity
    private async getRecentActivity(options: { userId?: string; organizationId?: string; departmentId?: string; limit?: number }) {
        const query: any = {};
        if (options.userId) query.userId = options.userId;
        if (options.organizationId) query.organizationId = options.organizationId;
        // Note: departmentId filtering would need join with user

        return this.auditRepo.find({
            where: query,
            order: { createdAt: 'DESC' },
            take: options.limit || 10,
            relations: ['user']
        });
    }

    // Member dashboard - personal tasks and activity
    async getMemberDashboard(userId: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ["id", "fullName", "email", "role", "isActive", "createdAt", "updatedAt"],
            relations: ["role"]
        });

        const totalTasks = await this.taskRepo.count({ where: { assignedUser: { id: userId } } });
        const completedTasks = await this.taskRepo.count({
            where: { assignedUser: { id: userId }, status: TaskStatus.DONE }
        });
        const inProgressTasks = await this.taskRepo.count({
            where: { assignedUser: { id: userId }, status: TaskStatus.IN_PROGRESS }
        });

        // Overdue tasks (assuming dueDate field exists or tasks created long ago)
        const now = new Date();
        const overdueTasks = await this.taskRepo.count({
            where: { 
                assignedUser: { id: userId }, 
                status: In([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
                // dueDate: LessThan(now) // Uncomment when dueDate is added
            }
        });

        const recentActivity = await this.getRecentActivity({ userId, limit: 5 });

        return {
            profile: user,
            totalTasks,
            completedTasks,
            inProgressTasks,
            pendingTasks: Math.max(totalTasks - completedTasks - inProgressTasks, 0),
            overdueTasks: 0, // Set to overdueTasks when dueDate is available
            recentActivity: recentActivity.map(a => ({
                id: a.id,
                action: a.action,
                description: `${a.action} on ${a.resource}`,
                timestamp: a.createdAt
            }))
        };
    }

    // Manager dashboard - team tasks and projects
    async getManagerDashboard(userId: string, departmentId?: string) {
        const memberStats = await this.getMemberDashboard(userId);

        // Get team members if department head
        let teamSize = 0;
        if (departmentId) {
            teamSize = await this.userRepo.count({ where: { departmentId } });
        }

        // Projects assigned to manager or department
        const projectQuery: any = {};
        if (departmentId) {
            projectQuery.departmentId = departmentId;
        }
        const totalProjects = await this.projectRepo.count(projectQuery);

        // Active workflows
        const activeWorkflows = await this.workflowRepo.count({ where: { isActive: true } });

        return {
            ...memberStats,
            teamSize,
            totalProjects,
            activeWorkflows,
        };
    }

    // Department Head dashboard - department performance
    async getDepartmentDashboard(userId: string, departmentId?: string) {
        const managerStats = await this.getManagerDashboard(userId, departmentId);

        if (!departmentId) {
            // No department assigned - return manager stats only
            return {
                ...managerStats,
                departmentName: null,
                departmentMembers: 0,
                activeMembers: 0,
                tasksByStatus: {},
            };
        }

        // Department details
        const department = await this.deptRepo.findOne({
            where: { id: departmentId },
            relations: ['manager', 'members']
        });

        // Department members
        const members = await this.userRepo.find({
            where: { departmentId },
            select: ['id', 'fullName', 'email', 'isActive']
        });

        // Tasks by status for department
        const departmentTasks = await this.taskRepo
            .createQueryBuilder('task')
            .innerJoin('task.assignedUser', 'user')
            .where('user.departmentId = :departmentId', { departmentId })
            .select('task.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('task.status')
            .getRawMany();

        const tasksByStatus = departmentTasks.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            ...managerStats,
            departmentName: department?.name,
            departmentMembers: members.length,
            activeMembers: members.filter(m => m.isActive).length,
            tasksByStatus,
        };
    }

    // Admin dashboard - organization-wide
    async getAdminDashboard(organizationId?: string) {
        const totalUsers = await this.userRepo.count(
            organizationId ? { where: { organizationId } } : undefined
        );
        const activeUsers = await this.userRepo.count({ 
            where: organizationId 
                ? { isActive: true, organizationId } 
                : { isActive: true } 
        });

        const totalProjects = await this.projectRepo.count();
        const totalTasks = await this.taskRepo.count();
        const completedTasks = await this.taskRepo.count({ where: { status: TaskStatus.DONE } });

        // Department count
        const departmentCount = await this.deptRepo.count(
            organizationId ? { where: { organizationId } } : undefined
        );

        // Active workflows
        const activeWorkflows = await this.workflowRepo.count(
            organizationId 
                ? { where: { isActive: true, organizationId } }
                : { where: { isActive: true } }
        );

        // Recent activity
        const recentActivity = await this.getRecentActivity({ 
            organizationId, 
            limit: 10 
        });

        return {
            totalUsers,
            activeUsers,
            inactiveUsers: Math.max(totalUsers - activeUsers, 0),
            totalProjects,
            totalTasks,
            completedTasks,
            inProgressTasks: await this.taskRepo.count({ where: { status: TaskStatus.IN_PROGRESS } }),
            departmentCount,
            activeWorkflows,
            usersTrend: 5, // Placeholder - calculate from historical data
            projectsTrend: 12, // Placeholder
            recentActivity: recentActivity.map(a => ({
                id: a.id,
                action: a.action,
                description: `${a.action} on ${a.resource}`,
                timestamp: a.createdAt,
                userName: a.user?.fullName
            }))
        };
    }

    // Super Admin dashboard - multi-org overview
    async getSuperAdminDashboard(organizationId?: string) {
        const adminStats = await this.getAdminDashboard(organizationId);

        const totalAdmins = await this.userRepo.count({ 
            where: [
                { legacyRole: UserRole.ADMIN }, 
                { legacyRole: UserRole.SUPER_ADMIN }
            ] 
        });

        // Organization stats (for super admin's org)
        let orgDetails = null;
        if (organizationId) {
            orgDetails = await this.orgRepo.findOne({
                where: { id: organizationId },
                select: ['id', 'name', 'isActive', 'createdAt']
            });
        }

        return {
            ...adminStats,
            totalAdmins,
            organization: orgDetails,
            systemSummary: {
                activeUsers: adminStats.activeUsers,
                inactiveUsers: adminStats.inactiveUsers,
                totalDepartments: adminStats.departmentCount
            }
        };
    }

    // Sudo Admin dashboard - system-wide
    async getSudoDashboard() {
        const superAdminStats = await this.getSuperAdminDashboard();

        // All organizations
        const totalOrganizations = await this.orgRepo.count();
        const activeOrganizations = await this.orgRepo.count({ where: { isActive: true } });

        // All departments across system
        const totalDepartments = await this.deptRepo.count();

        // All workflows
        const totalWorkflows = await this.workflowRepo.count();

        // System-wide user stats by role
        const usersByRole = await this.userRepo
            .createQueryBuilder('user')
            .select('user.legacyRole', 'role')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.legacyRole')
            .getRawMany();

        return {
            ...superAdminStats,
            totalOrganizations,
            activeOrganizations,
            inactiveOrganizations: totalOrganizations - activeOrganizations,
            totalDepartments,
            totalWorkflows,
            usersByRole: usersByRole.reduce((acc, item) => {
                acc[item.role || 'unknown'] = parseInt(item.count);
                return acc;
            }, {} as Record<string, number>),
            systemHealth: {
                database: 'connected',
                api: 'healthy',
                email: 'operational'
            }
        };
    }

    // Legacy methods for backwards compatibility
    async getUserDashboard(userId: string) {
        return this.getMemberDashboard(userId);
    }
}
