"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorklogController = void 0;
const WorklogService_1 = require("../services/WorklogService");
class WorklogController {
    async listByProject(req, res) {
        try {
            const worklogs = await WorklogService_1.worklogService.getByProject(String(req.params.projectId));
            res.json({ data: worklogs });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async listByUser(req, res) {
        try {
            const userId = req.query.userId || req.user.id;
            const worklogs = await WorklogService_1.worklogService.getByUser(userId);
            res.json({ data: worklogs });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async create(req, res) {
        try {
            const worklog = await WorklogService_1.worklogService.createManual({
                ...req.body,
                userId: req.body.userId || req.user.id,
            });
            res.status(201).json({ data: worklog });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
exports.WorklogController = WorklogController;
