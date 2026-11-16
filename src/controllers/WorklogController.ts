import { AppDataSource as db } from '../config/data-source';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';
import { Worklog } from '../entities/Worklog';
import { projectAccess, taskAccess, organizationAccess } from '../services/ProjectAccess';
import { ApiError } from '../middlewares/errorHandler';

async function scopedLogs(req: AuthRequest, logs: Worklog[]) {
 const org=req.get('X-Organization-Id') || req.user?.organizationId || req.user?.teamId;
 if(!org) throw new ApiError('Organization context required',400);
 await organizationAccess(req.user!.id,org);
 const permitted=[];
 for(const row of logs) {
  try {
   const project=row.projectId?await db.getRepository(Project).findOneBy({id:row.projectId}):row.workflowId?await db.getRepository(Project).findOneBy({workflowId:row.workflowId}):null;
   if(project){const a=await projectAccess(req.user!.id,project.id,org);if(row.taskId)await taskAccess(req.user!.id,row.taskId);else if(!a.manage && row.userId!==req.user!.id)continue;}
   else if(row.userId!==req.user!.id)continue;
   if(row.taskId)await taskAccess(req.user!.id,row.taskId);
   permitted.push(row);
  }catch(e){if(!(e instanceof ApiError)||![403,404].includes(e.statusCode))throw e;}
 }
 return permitted;
}
async function validateWorklogTarget(req:AuthRequest) {
 if(req.body.userId && req.body.userId!==req.user!.id) throw new ApiError('Log time only for yourself',403);
 const org=req.get('X-Organization-Id')||req.user?.organizationId||req.user?.teamId;
 if(req.body.projectId)await projectAccess(req.user!.id,req.body.projectId,org);
 if(req.body.workflowId){const p=await db.getRepository(Project).findOneBy({workflowId:req.body.workflowId});if(!p)throw new ApiError('Project workflow required',400);await projectAccess(req.user!.id,p.id,org);if(req.body.projectId && p.id!==req.body.projectId)throw new ApiError('Project/workflow mismatch',400);}
 if(req.body.taskId){await taskAccess(req.user!.id,req.body.taskId);const t=await db.getRepository(Task).findOneByOrFail({id:req.body.taskId});if(req.body.projectId&&t.projectId!==req.body.projectId)throw new ApiError('Project/task mismatch',400);if(req.body.workflowId&&t.workflowId!==req.body.workflowId)throw new ApiError('Workflow/task mismatch',400);}
 if(req.body.hours!==undefined&&(!Number.isFinite(req.body.hours)||req.body.hours<0||req.body.hours>24))throw new ApiError('Hours must be between 0 and 24',400);
}
import { Response } from "express";
import ExcelJS from "exceljs";
import { AuthRequest } from "../middlewares/auth";
import { PermissionRequest } from "../middlewares/permission";
import { worklogService, WorklogFilter } from "../services/WorklogService";

export class WorklogController {
    async listByProject(req: AuthRequest, res: Response) {
        try {
            await projectAccess(req.user!.id,String(req.params.projectId),req.get('X-Organization-Id'));
            const worklogs = await scopedLogs(req, await worklogService.getByProject(String(req.params.projectId)));
            res.json({ data: worklogs });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async listByUser(req: AuthRequest, res: Response) {
        try {
            const userId = (req.query.userId as string) || req.user!.id;
            const worklogs = await scopedLogs(req, await worklogService.getByUser(userId));
            res.json({ data: worklogs });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async create(req: AuthRequest, res: Response) {
        try {
            await validateWorklogTarget(req);
            const worklog = await worklogService.createManual({
                ...req.body,
                userId: req.body.userId || req.user!.id,
            });
            res.status(201).json({ data: worklog });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async confirmCompletion(req: AuthRequest, res: Response) {
        try {
            await validateWorklogTarget(req);
            const task = await db.getRepository(Task).findOneByOrFail({id:req.body.taskId});
            if(task.assigneeId !== req.user!.id)throw new ApiError("Only the assignee can confirm their logged time",403);
            const worklog = await worklogService.confirmCompletion({
                taskId: req.body.taskId,
                userId: req.body.userId || req.user!.id,
                hours: req.body.hours,
                otherWork: req.body.otherWork,
                description: req.body.description,
            });
            res.status(201).json({ data: worklog });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async update(req: AuthRequest, res: Response) {
        try {
            const worklog = await worklogService.updateWorklog(
                String(req.params.id),
                {
                    hours: req.body.hours,
                    description: req.body.description,
                    otherWork: req.body.otherWork,
                },
                req.user!.id
            );
            res.json({ data: worklog });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async listAll(req: PermissionRequest, res: Response) {
        try {
            const filter = buildFilter(req);
            const worklogs = await scopedLogs(req, await worklogService.listForManagement(filter));
            res.json({ data: worklogs });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async exportExcel(req: PermissionRequest, res: Response) {
        try {
            const filter = buildFilter(req);
            const worklogs = await scopedLogs(req, await worklogService.listForManagement(filter));

            const workbook = new ExcelJS.Workbook();
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
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
}

/**
 * Build a management filter scoped to the requester's organization/department.
 * Higher-privileged (org/system scope) users see the whole organization;
 * others are constrained to their own department.
 */
function buildFilter(req: PermissionRequest): WorklogFilter {
    const ctx = req.userContext;
    const scopeToDepartment = ctx ? ctx.roleLevel >= RoleLevelDepartmentHead : false;

    return {
        organizationId: ctx?.organizationId,
        departmentId: scopeToDepartment ? ctx?.departmentId : undefined,
        userId: (req.query.userId as string) || undefined,
        projectId: (req.query.projectId as string) || undefined,
        from: (req.query.from as string) || undefined,
        to: (req.query.to as string) || undefined,
    };
}

// RoleLevel.DEPARTMENT_HEAD === 3; managers (4) and department heads see their
// department only, admins and above see the whole organization.
const RoleLevelDepartmentHead = 3;
