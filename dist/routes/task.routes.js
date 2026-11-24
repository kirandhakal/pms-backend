"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProjectAccess_1 = require("../services/ProjectAccess");
const data_source_1 = require("../config/data-source");
const Task_1 = require("../entities/Task");
const Project_1 = require("../entities/Project");
const errorHandler_1 = require("../middlewares/errorHandler");
const express_1 = require("express");
const TaskController_1 = require("../controllers/TaskController");
const auth_1 = require("../middlewares/auth");
const User_1 = require("../entities/User");
const router = (0, express_1.Router)();
const taskController = new TaskController_1.TaskController();
router.use(auth_1.authenticate);
// Prevent the legacy mutation path from bypassing project/stage authorization.
router.use(async (req, _res, next) => {
    try {
        if (req.method === 'POST' && req.path === '/') {
            if (!req.body.projectId)
                throw new errorHandler_1.ApiError('Use a scoped project task endpoint', 400);
            (0, ProjectAccess_1.requireManagement)(await (0, ProjectAccess_1.projectAccess)(req.user.id, req.body.projectId, req.get('X-Organization-Id')));
            throw new errorHandler_1.ApiError('Create project tasks through /projects/:id/tasks', 409);
        }
        const match = req.path.match(/^\/([^/]+)\/status$/);
        if (match && req.method === 'PATCH') {
            await (0, ProjectAccess_1.taskAccess)(req.user.id, match[1]);
            const task = await data_source_1.AppDataSource.getRepository(Task_1.Task).findOneByOrFail({ id: match[1] });
            const project = task.projectId ? await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ id: task.projectId }) : task.workflowId ? await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ workflowId: task.workflowId }) : null;
            if (project) {
                (0, ProjectAccess_1.requireManagement)(await (0, ProjectAccess_1.projectAccess)(req.user.id, project.id, req.get('X-Organization-Id')));
                throw new errorHandler_1.ApiError('Move project tasks using their workflow stage through /projects/:id/tasks/:taskId', 409);
            }
        }
        next();
    }
    catch (e) {
        next(e);
    }
});
router.post("/", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), taskController.create);
router.patch("/:taskId/status", taskController.updateStatus);
// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
router.get("/progress/:userId", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), taskController.getIndividualProgress);
exports.default = router;
