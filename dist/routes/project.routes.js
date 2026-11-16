"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const promises_1 = require("stream/promises");
const exceljs_1 = __importDefault(require("exceljs"));
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const errorHandler_1 = require("../middlewares/errorHandler");
const pm = __importStar(require("../services/ProjectManagementService"));
const docs = __importStar(require("../services/ProjectDocumentService"));
const ProjectAccess_1 = require("../services/ProjectAccess");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function org(req) { return zod_1.z.uuid().parse(req.get('X-Organization-Id') || req.user?.organizationId || req.user?.teamId); }
const wrap = (fn) => async (req, res, next) => { try {
    await fn(req, res);
}
catch (e) {
    next(e instanceof zod_1.z.ZodError ? new errorHandler_1.ApiError(e.issues.map(i => i.message).join('; '), 400) : e);
} };
const id = (req) => zod_1.z.uuid().parse(req.params.id);
router.get('/', wrap(async (req, res) => res.json(await pm.listProjects(req.user.id, org(req)))));
router.post('/', wrap(async (req, res) => res.status(201).json(await pm.createProject(req.user.id, org(req), req.body))));
router.get('/eligible-members', wrap(async (req, res) => res.json(await pm.eligibleMembers(req.user.id, org(req)))));
router.get('/capabilities', wrap(async (req, res) => res.json({ create: (await (0, ProjectAccess_1.organizationAccess)(req.user.id, org(req))).admin })));
router.post('/resources', wrap(async (req, res) => res.status(201).json(await pm.createResource(req.user.id, org(req), req.body))));
router.put('/documents/:documentId/content', express_1.default.raw({ type: 'application/octet-stream', limit: docs.documentLimit(), inflate: false }), wrap(async (req, res) => res.json(await docs.uploadDocument(req.user.id, org(req), zod_1.z.uuid().parse(req.params.documentId), req.body))));
router.get('/documents/:documentId/content', wrap(async (req, res) => {
    const { document: d, object } = await docs.documentContent(req.user.id, org(req), zod_1.z.uuid().parse(req.params.documentId));
    const inline = req.query.preview === 'true' && (d.mimeType === 'application/pdf' || d.mimeType.startsWith('image/'));
    res.set({ 'Content-Type': d.mimeType, 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(d.name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
    await (0, promises_1.pipeline)(object.Body, res);
}));
router.get('/:id', wrap(async (req, res) => res.json((await pm.projectDetail(req.user.id, org(req), id(req))).project)));
router.get('/:id/summary', wrap(async (req, res) => res.json(await pm.projectDetail(req.user.id, org(req), id(req)))));
router.get('/:id/workflow', wrap(async (req, res) => { const d = await pm.projectDetail(req.user.id, org(req), id(req)); res.json({ data: { project: d.project, viewerRole: d.viewerRole, workflow: { id: d.project.workflowId, stages: d.stages, tasks: d.tasks } } }); }));
router.post('/:id/members', wrap(async (req, res) => res.json(await pm.updateMember(req.user.id, org(req), id(req), req.body))));
router.put('/:id/members/:userId', wrap(async (req, res) => res.json(await pm.updateMember(req.user.id, org(req), id(req), { ...req.body, userId: zod_1.z.uuid().parse(req.params.userId) }))));
router.get('/:id/tasks', wrap(async (req, res) => res.json((await pm.projectDetail(req.user.id, org(req), id(req))).tasks)));
router.post('/:id/tasks', wrap(async (req, res) => res.status(201).json(await pm.saveTask(req.user.id, org(req), id(req), undefined, req.body))));
router.patch('/:id/tasks/:taskId', wrap(async (req, res) => res.json(await pm.saveTask(req.user.id, org(req), id(req), zod_1.z.uuid().parse(req.params.taskId), req.body))));
router.get('/:id/documents', wrap(async (req, res) => res.json(await docs.documentList(req.user.id, org(req), id(req), req.query.library === 'true'))));
router.post('/:id/documents', wrap(async (req, res) => res.status(201).json(await docs.beginDocument(req.user.id, org(req), id(req), req.body))));
router.post('/:id/documents/:documentId/link', wrap(async (req, res) => { await docs.linkDocument(req.user.id, org(req), id(req), zod_1.z.uuid().parse(req.params.documentId)); res.json({ message: 'Document linked' }); }));
router.get('/:id/resources', wrap(async (req, res) => res.json(await pm.resourceList(req.user.id, org(req), id(req)))));
router.post('/:id/allocations', wrap(async (req, res) => res.status(201).json(await pm.allocateResource(req.user.id, org(req), id(req), req.body))));
router.delete('/:id/allocations/:allocationId', wrap(async (req, res) => { await pm.releaseResource(req.user.id, org(req), id(req), zod_1.z.uuid().parse(req.params.allocationId)); res.json({ message: 'Resource released' }); }));
router.get('/:id/reports', wrap(async (req, res) => res.json(await pm.report(req.user.id, org(req), id(req), req.query))));
router.get('/:id/reports/export', wrap(async (req, res) => {
    const data = await pm.report(req.user.id, org(req), id(req), req.query);
    const workbook = new exceljs_1.default.Workbook();
    const sheets = { Summary: [{ project: data.project.name, from: data.range.from, to: data.range.to, total: data.summary.total, done: data.summary.done, progress: data.summary.progress, overdue: data.summary.overdue.length, snapshot: data.snapshot }], Tasks: data.tasks.map(t => ({ name: t.name, status: t.status, stage: data.stages.find(s => s.id === t.stageId)?.name, assignee: data.members.find(m => m.userId === t.assigneeId)?.user.name, dueDate: t.dueDate })), Stages: data.stages.map(s => ({ name: s.name, tasks: data.tasks.filter(t => t.stageId === s.id).length })), Team: data.members.map(m => ({ name: m.user.name, role: m.role })), Worklogs: data.worklogs.map(w => ({ date: w.logDate, hours: w.hours, description: w.description })), Resources: data.resources, Documents: data.documents, Discussions: data.discussions, Meetings: data.meetings, Activity: data.activity };
    for (const [name, rows] of Object.entries(sheets)) {
        const sheet = workbook.addWorksheet(name);
        if (rows.length) {
            sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 28 }));
            sheet.addRows(rows);
            sheet.getRow(1).font = { bold: true };
        }
        else
            sheet.addRow(['No activity in this date range']);
    }
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="project-report-${data.range.from}-${data.range.to}.xlsx"`, 'Cache-Control': 'private, no-store' });
    await workbook.xlsx.write(res);
    res.end();
}));
exports.default = router;
