import { Request, Response } from "express";
import { DashboardService } from "../services/DashboardService";

const dashboardService = new DashboardService();

export class PublicController {
    async getStats(req: Request, res: Response) {
        const adminStats = await dashboardService.getAdminDashboard();

        res.json({
            users: adminStats.totalUsers,
            activeUsers: adminStats.activeUsers,
            inactiveUsers: adminStats.inactiveUsers,
            uptime: process.uptime()
        });
    }

    async getFeatures(req: Request, res: Response) {
        res.json({
            navbar: ["Features", "Pricing", "About", "Login"],
            footer: {
                product: ["Kanban", "Workflow", "Calendar"],
                company: ["About", "Contact", "Privacy"]
            },
            highlights: [
                "Role-based dashboards",
                "JWT authentication",
                "Project and task tracking"
            ]
        });
    }
}
