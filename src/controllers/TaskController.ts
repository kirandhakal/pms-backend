import { AppDataSource as db } from '../config/data-source';
import { Project } from '../entities/Project';
import { taskAccess, projectAccess, organizationAccess } from '../services/ProjectAccess';
import { ApiError } from '../middlewares/errorHandler';

async function scopedProgress(req:AuthRequest, userId:string) {
 const org=req.get('X-Organization-Id')||req.user?.organizationId||req.user?.teamId;
 if(org)await organizationAccess(req.user!.id,org);
 const candidates=await db.getRepository(Task).find({where:{assigneeId:userId,isArchived:false}});
 const tasks=[];
 for(const t of candidates){
  try{await taskAccess(req.user!.id,t.id);const p=t.projectId?await db.getRepository(Project).findOneBy({id:t.projectId}):t.workflowId?await db.getRepository(Project).findOneBy({workflowId:t.workflowId}):null;
   if(p)await projectAccess(req.user!.id,p.id,org);else if(org && t.teamId!==org)continue;
   tasks.push(t);
  }catch(e){if(!(e instanceof ApiError)||![403,404].includes(e.statusCode))throw e;}
 }
 const completed=tasks.filter(t=>t.status===TaskStatus.DONE).length;
 const inProgress=tasks.filter(t=>t.status===TaskStatus.IN_PROGRESS).length;
 return {userId,totalTasks:tasks.length,completedTasks:completed,inProgressTasks:inProgress,pendingTasks:tasks.length-completed-inProgress,overallCompletion:tasks.length?Math.round(completed/tasks.length*100):0,tasks:tasks.map(t=>({id:t.id,name:t.name,status:t.status,completion:t.completionPercentage,updatedAt:t.updatedAt}))};
}
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { TaskService } from "../services/TaskService";
import { Task, TaskStatus } from "../entities/Task";

const taskService = new TaskService();

export class TaskController {
    async create(req: AuthRequest, res: Response) {
        try {
            const task = await taskService.createTask(req.body);
            res.status(201).json(task);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async updateStatus(req: AuthRequest, res: Response) {
        try {
            const taskIdParam = req.params.taskId;
            if (!taskIdParam || Array.isArray(taskIdParam)) {
                return res.status(400).json({ message: "taskId is required" });
            }
            const { status, completion } = req.body;
            const updated = await taskService.updateTaskStatus(
                taskIdParam,
                status as TaskStatus,
                completion,
                req.user?.id
            );
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getMyProgress(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const progress = await scopedProgress(req, req.user.id);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getIndividualProgress(req: AuthRequest, res: Response) {
        try {
            const userIdParam = req.params.userId;
            if (!userIdParam || Array.isArray(userIdParam)) {
                return res.status(400).json({ message: "userId is required" });
            }
            const progress = await scopedProgress(req, userIdParam);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}