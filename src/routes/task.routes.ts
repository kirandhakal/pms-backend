import { taskAccess, projectAccess, requireManagement } from '../services/ProjectAccess';
import { AppDataSource as db } from '../config/data-source';
import { Task } from '../entities/Task';
import { Project } from '../entities/Project';
import { ApiError } from '../middlewares/errorHandler';
import { Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const taskController = new TaskController();

router.use(authenticate);
// Prevent the legacy mutation path from bypassing project/stage authorization.
router.use(async (req, _res, next) => {
 try {
  if(req.method === 'POST' && req.path === '/') {
   if(!req.body.projectId) throw new ApiError('Use a scoped project task endpoint',400);
   requireManagement(await projectAccess(req.user!.id, req.body.projectId, req.get('X-Organization-Id')));
   throw new ApiError('Create project tasks through /projects/:id/tasks',409);
  }
  const match=req.path.match(/^\/([^/]+)\/status$/);
  if(match && req.method === 'PATCH') {
   await taskAccess(req.user!.id,match[1]);
   const task=await db.getRepository(Task).findOneByOrFail({id:match[1]});
   const project=task.projectId?await db.getRepository(Project).findOneBy({id:task.projectId}):task.workflowId?await db.getRepository(Project).findOneBy({workflowId:task.workflowId}):null;
   if(project) {requireManagement(await projectAccess(req.user!.id,project.id,req.get('X-Organization-Id')));throw new ApiError('Move project tasks using their workflow stage through /projects/:id/tasks/:taskId',409);}
  }
  next();
 }catch(e){next(e);}
});

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), taskController.create);
router.patch("/:taskId/status", taskController.updateStatus);

// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
router.get("/progress/:userId", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), taskController.getIndividualProgress);

export default router;
