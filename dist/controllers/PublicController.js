"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const DashboardService_1 = require("../services/DashboardService");
const dashboardService = new DashboardService_1.DashboardService();
class PublicController {
    async getStats(req, res) {
        const adminStats = await dashboardService.getAdminDashboard();
        res.json({
            users: adminStats.totalUsers,
            activeUsers: adminStats.activeUsers,
            inactiveUsers: adminStats.inactiveUsers,
            uptime: process.uptime()
        });
    }
    async getFeatures(req, res) {
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
exports.PublicController = PublicController;
