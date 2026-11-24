"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorklogController = void 0;
const data_source_1 = require("../config/data-source");
const Project_1 = require("../entities/Project");
const Task_1 = require("../entities/Task");
const ProjectAccess_1 = require("../services/ProjectAccess");
const errorHandler_1 = require("../middlewares/errorHandler");
async function scopedLogs(req, logs) {
    const org = req.get('X-Organization-Id') || req.user?.organizationId || req.user?.teamId;
    if (!org)
        throw new errorHandler_1.ApiError('Organization context required', 400);
    await (0, ProjectAccess_1.organizationAccess)(req.user.id, org);
    const permitted = [];
    for (const row of logs) {
        try {
            const project = row.projectId ? await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ id: row.projectId }) : row.workflowId ? await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ workflowId: row.workflowId }) : null;
            if (project) {
                const a = await (0, ProjectAccess_1.projectAccess)(req.user.id, project.id, org);
                if (row.taskId)
                    await (0, ProjectAccess_1.taskAccess)(req.user.id, row.taskId);
                else if (!a.manage && row.userId !== req.user.id)
                    continue;
            }
            else if (row.userId !== req.user.id)
                continue;
            if (row.taskId)
                await (0, ProjectAccess_1.taskAccess)(req.user.id, row.taskId);
            permitted.push(row);
        }
        catch (e) {
            if (!(e instanceof errorHandler_1.ApiError) || ![403, 404].includes(e.statusCode))
                throw e;
        }
    }
    return permitted;
}
async function validateWorklogTarget(req) {
    if (req.body.userId && req.body.userId !== req.user.id)
        throw new errorHandler_1.ApiError('Log time only for yourself', 403);
    const org = req.get('X-Organization-Id') || req.user?.organizationId || req.user?.teamId;
    if (req.body.projectId)
        await (0, ProjectAccess_1.projectAccess)(req.user.id, req.body.projectId, org);
    if (req.body.workflowId) {
        const p = await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ workflowId: req.body.workflowId });
        if (!p)
            throw new errorHandler_1.ApiError('Project workflow required', 400);
        await (0, ProjectAccess_1.projectAccess)(req.user.id, p.id, org);
        if (req.body.projectId && p.id !== req.body.projectId)
            throw new errorHandler_1.ApiError('Project/workflow mismatch', 400);
    }
    if (req.body.taskId) {
        await (0, ProjectAccess_1.taskAccess)(req.user.id, req.body.taskId);
        const t = await data_source_1.AppDataSource.getRepository(Task_1.Task).findOneByOrFail({ id: req.body.taskId });
        if (req.body.projectId && t.projectId !== req.body.projectId)
            throw new errorHandler_1.ApiError('Project/task mismatch', 400);
        if (req.body.workflowId && t.workflowId !== req.body.workflowId)
            throw new errorHandler_1.ApiError('Workflow/task mismatch', 400);
    }
    if (req.body.hours !== undefined && (!Number.isFinite(req.body.hours) || req.body.hours < 0 || req.body.hours > 24))
        throw new errorHandler_1.ApiError('Hours must be between 0 and 24', 400);
}
const exceljs_1 = __importDefault(require("exceljs"));
const WorklogService_1 = require("../services/WorklogService");
class WorklogController {
    async listByProject(req, res) {
        try {
            await (0, ProjectAccess_1.projectAccess)(req.user.id, String(req.params.projectId), req.get('X-Organization-Id'));
            const worklogs = await scopedLogs(req, await WorklogService_1.worklogService.getByProject(String(req.params.projectId)));
            res.json({ data: worklogs });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async listByUser(req, res) {
        try {
            const userId = req.query.userId || req.user.id;
            const worklogs = await scopedLogs(req, await WorklogService_1.worklogService.getByUser(userId));
            res.json({ data: worklogs });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async create(req, res) {
        try {
            await validateWorklogTarget(req);
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
    async confirmCompletion(req, res) {
        try {
            await validateWorklogTarget(req);
            const task = await data_source_1.AppDataSource.getRepository(Task_1.Task).findOneByOrFail({ id: req.body.taskId });
            if (task.assigneeId !== req.user.id)
                throw new errorHandler_1.ApiError("Only the assignee can confirm their logged time", 403);
            const worklog = await WorklogService_1.worklogService.confirmCompletion({
                taskId: req.body.taskId,
                userId: req.body.userId || req.user.id,
                hours: req.body.hours,
                otherWork: req.body.otherWork,
                description: req.body.description,
            });
            res.status(201).json({ data: worklog });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async update(req, res) {
        try {
            const worklog = await WorklogService_1.worklogService.updateWorklog(String(req.params.id), {
                hours: req.body.hours,
                description: req.body.description,
                otherWork: req.body.otherWork,
            }, req.user.id);
            res.json({ data: worklog });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async listAll(req, res) {
        try {
            const filter = buildFilter(req);
            const worklogs = await scopedLogs(req, await WorklogService_1.worklogService.listForManagement(filter));
            res.json({ data: worklogs });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async exportExcel(req, res) {
        try {
            const filter = buildFilter(req);
            const worklogs = await scopedLogs(req, await WorklogService_1.worklogService.listForManagement(filter));
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = "PMS";
            workbook.created = new Date();
            const sheet = workbook.addWorksheet("Worklogs");
            sheet.columns = [
                { header: "Date", key: "logDate", width: 14 },
                { header: "Employee", key: "employee", width: 24 },
                { header: "Email", key: "email", width: 28 },
                { header: "Project", key: "project", width: 24 },
                { header: "Task", key: "task", width: 30 },
                { header: "Description", key: "description", width: 40 },
                { header: "Other Work", key: "otherWork", width: 40 },
                { header: "Hours", key: "hours", width: 10 },
                { header: "Module", key: "module", width: 18 },
                { header: "Source", key: "source", width: 12 },
                { header: "Confirmed", key: "confirmed", width: 12 },
            ];
            sheet.getRow(1).font = { bold: true };
            for (const w of worklogs) {
                sheet.addRow({
                    logDate: w.logDate,
                    employee: w.user?.fullName || "",
                    email: w.user?.email || "",
                    project: w.project?.name || "",
                    task: w.task?.name || "",
                    description: w.description,
                    otherWork: w.otherWork || "",
                    hours: Number(w.hours),
                    module: w.module || "",
                    source: w.autoGenerated ? "Auto" : "Manual",
                    confirmed: w.confirmed ? "Yes" : "No",
                });
            }
            const fileName = `worklogs-${new Date().toISOString().slice(0, 10)}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            await workbook.xlsx.write(res);
            res.end();
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
}
exports.WorklogController = WorklogController;
/**
 * Build a management filter scoped to the requester's organization/department.
 * Higher-privileged (org/system scope) users see the whole organization;
 * others are constrained to their own department.
 */
function buildFilter(req) {
    const ctx = req.userContext;
    const scopeToDepartment = ctx ? ctx.roleLevel >= RoleLevelDepartmentHead : false;
    return {
        organizationId: ctx?.organizationId,
        departmentId: scopeToDepartment ? ctx?.departmentId : undefined,
        userId: req.query.userId || undefined,
        projectId: req.query.projectId || undefined,
        from: req.query.from || undefined,
        to: req.query.to || undefined,
    };
}
// RoleLevel.DEPARTMENT_HEAD === 3; managers (4) and department heads see their
// department only, admins and above see the whole organization.
const RoleLevelDepartmentHead = 3;
