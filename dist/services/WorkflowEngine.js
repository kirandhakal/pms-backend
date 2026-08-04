"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowEngine = exports.WorkflowEngine = exports.DEFAULT_WORKFLOW_STAGES = void 0;
const data_source_1 = require("../config/data-source");
const Workflow_1 = require("../entities/Workflow");
const WorkflowStage_1 = require("../entities/WorkflowStage");
const WorkflowStageMember_1 = require("../entities/WorkflowStageMember");
const Task_1 = require("../entities/Task");
const TaskActivity_1 = require("../entities/TaskActivity");
const errorHandler_1 = require("../middlewares/errorHandler");
const workflow_stages_1 = require("../constants/workflow-stages");
const WorklogService_1 = require("./WorklogService");
const ProjectMember_1 = require("../entities/ProjectMember");
/**
 * Default workflow stages
 */
exports.DEFAULT_WORKFLOW_STAGES = [
    { name: "Backlog", order: 0, color: "#94a3b8", isDefault: true, isFinal: false },
    { name: "Developer", order: 1, color: "#3b82f6", isDefault: false, isFinal: false },
    { name: "DevOps", order: 2, color: "#8b5cf6", isDefault: false, isFinal: false },
    { name: "Tester", order: 3, color: "#f59e0b", isDefault: false, isFinal: false },
    { name: "Done", order: 4, color: "#22c55e", isDefault: false, isFinal: true }
];
/**
 * Workflow Engine - State Machine for Task Workflow Management
 *
 * Provides:
 * - Workflow creation with customizable stages
 * - Stage transition validation
 * - Transition hooks (onEnter, onExit)
 * - Activity logging
 */
class WorkflowEngine {
    constructor() {
        this.workflowRepo = data_source_1.AppDataSource.getRepository(Workflow_1.Workflow);
        this.stageRepo = data_source_1.AppDataSource.getRepository(WorkflowStage_1.WorkflowStage);
        this.stageMemberRepo = data_source_1.AppDataSource.getRepository(WorkflowStageMember_1.WorkflowStageMember);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
        this.activityRepo = data_source_1.AppDataSource.getRepository(TaskActivity_1.TaskActivity);
    }
    /**
     * Create a new workflow with stages
     */
    async createWorkflow(data) {
        const workflow = this.workflowRepo.create({
            name: data.name,
            description: data.description,
            organizationId: data.organizationId,
            createdById: data.createdById,
            settings: data.settings || {
                allowBackwardTransition: true,
                requireAssignee: false,
                notifyOnStageChange: true
            },
            isDefault: data.isDefault ?? false,
            isActive: true
        });
        const savedWorkflow = await this.workflowRepo.save(workflow);
        // Create stages
        const stagesData = data.stages?.length ? data.stages : exports.DEFAULT_WORKFLOW_STAGES;
        const stages = stagesData.map((stage, index) => {
            return this.stageRepo.create({
                name: stage.name,
                order: stage.order ?? index,
                color: stage.color || "#6b7280",
                isDefault: stage.isDefault || false,
                isFinal: stage.isFinal || false,
                settings: 'settings' in stage ? stage.settings : undefined,
                workflowId: savedWorkflow.id,
                isActive: true
            });
        });
        await this.stageRepo.save(stages);
        // Generate default transitions (linear flow)
        const transitions = this.generateDefaultTransitions(stages);
        savedWorkflow.transitions = transitions;
        await this.workflowRepo.save(savedWorkflow);
        return this.getWorkflowById(savedWorkflow.id);
    }
    /**
     * Create a project-specific workflow with role-based stage visibility
     */
    async createProjectWorkflow(projectName, organizationId, createdById) {
        const stages = workflow_stages_1.PROJECT_WORKFLOW_STAGES.map((stage) => ({
            name: stage.name,
            order: stage.order,
            color: stage.color,
            isDefault: stage.isDefault,
            isFinal: stage.isFinal,
            settings: {
                category: stage.category,
                assignedRole: stage.assignedRole,
                visibleToRoles: stage.visibleToRoles,
            },
        }));
        return this.createWorkflow({
            name: `${projectName} Workflow`,
            description: `Auto-generated workflow for ${projectName}`,
            organizationId,
            createdById,
            isDefault: false,
            settings: {
                allowBackwardTransition: true,
                requireAssignee: false,
                notifyOnStageChange: true,
            },
            stages,
        });
    }
    /**
     * Filter workflow stages by viewer's project role
     */
    async getVisibleStages(workflowId, viewerRole) {
        const workflow = await this.getWorkflowById(workflowId);
        if (!workflow) {
            throw new errorHandler_1.ApiError("Workflow not found", 404);
        }
        return workflow.stages.filter((stage) => (0, workflow_stages_1.canViewStage)({ category: stage.settings?.category, settings: stage.settings }, viewerRole));
    }
    /**
     * Get workflow with stages
     */
    async getWorkflowById(workflowId) {
        return this.workflowRepo.findOne({
            where: { id: workflowId },
            relations: ["stages", "stages.stageMembers"],
            order: { stages: { order: "ASC" } }
        });
    }
    /**
     * Get workflows for organization
     */
    async getWorkflowsByOrganization(organizationId) {
        return this.workflowRepo.find({
            where: { organizationId, isActive: true },
            relations: ["stages"],
            order: { createdAt: "DESC", stages: { order: "ASC" } }
        });
    }
    /**
     * Get or create default workflow for organization
     */
    async getOrCreateDefaultWorkflow(organizationId, createdById) {
        // Check for existing default
        let workflow = await this.workflowRepo.findOne({
            where: { organizationId, isDefault: true, isActive: true },
            relations: ["stages"]
        });
        if (workflow) {
            return workflow;
        }
        // Create default workflow
        workflow = await this.createWorkflow({
            name: "Default Workflow",
            description: "Standard workflow with Developer, DevOps, and Tester stages",
            organizationId,
            createdById,
            settings: {
                allowBackwardTransition: true,
                requireAssignee: false,
                notifyOnStageChange: true
            }
        });
        workflow.isDefault = true;
        return this.workflowRepo.save(workflow);
    }
    /**
     * Add stage to workflow
     */
    async addStage(workflowId, data) {
        const workflow = await this.workflowRepo.findOne({
            where: { id: workflowId },
            relations: ["stages"]
        });
        if (!workflow) {
            throw new errorHandler_1.ApiError("Workflow not found", 404);
        }
        // Determine order
        const maxOrder = Math.max(...workflow.stages.map(s => s.order), -1);
        const stage = this.stageRepo.create({
            name: data.name,
            order: data.order ?? maxOrder + 1,
            color: data.color || "#6b7280",
            workflowId,
            settings: data.settings,
            isActive: true
        });
        return this.stageRepo.save(stage);
    }
    /**
     * Update stage
     */
    async updateStage(stageId, data) {
        const stage = await this.stageRepo.findOne({ where: { id: stageId } });
        if (!stage) {
            throw new errorHandler_1.ApiError("Stage not found", 404);
        }
        Object.assign(stage, data);
        return this.stageRepo.save(stage);
    }
    /**
     * Delete stage
     */
    async deleteStage(stageId) {
        const stage = await this.stageRepo.findOne({
            where: { id: stageId },
            relations: ["tasks", "workflow"]
        });
        if (!stage) {
            throw new errorHandler_1.ApiError("Stage not found", 404);
        }
        // Check if tasks exist in this stage
        if (stage.tasks?.length > 0) {
            throw new errorHandler_1.ApiError("Cannot delete stage with tasks. Move tasks first.", 400);
        }
        // Check if it's the only stage
        const stageCount = await this.stageRepo.count({
            where: { workflowId: stage.workflowId, isActive: true }
        });
        if (stageCount <= 1) {
            throw new errorHandler_1.ApiError("Cannot delete the last stage", 400);
        }
        stage.isActive = false;
        await this.stageRepo.save(stage);
    }
    /**
     * Reorder stages
     */
    async reorderStages(workflowId, stageOrders) {
        const stages = await this.stageRepo.find({ where: { workflowId } });
        const orderMap = new Map(stageOrders.map(s => [s.id, s.order]));
        for (const stage of stages) {
            if (orderMap.has(stage.id)) {
                stage.order = orderMap.get(stage.id);
            }
        }
        return this.stageRepo.save(stages);
    }
    /**
     * Transition task to a new stage
     */
    async transitionTask(taskId, toStageId, userId, actorRole) {
        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ["stage", "workflow", "workflow.stages"]
        });
        if (!task) {
            throw new errorHandler_1.ApiError("Task not found", 404);
        }
        const toStage = await this.stageRepo.findOne({ where: { id: toStageId } });
        if (!toStage) {
            throw new errorHandler_1.ApiError("Target stage not found", 404);
        }
        // Validate transition
        const fromStage = task.stage;
        const isValidTransition = await this.validateTransition(task.workflow, fromStage, toStage);
        if (!isValidTransition) {
            throw new errorHandler_1.ApiError(`Cannot transition from "${fromStage.name}" to "${toStage.name}"`, 400);
        }
        // Role-based drag: non-elevated actors may only move stages in their team category
        if (actorRole && !(0, workflow_stages_1.canDragStage)({
            category: fromStage.settings?.category,
            settings: fromStage.settings,
        }, actorRole)) {
            throw new errorHandler_1.ApiError(`Role ${actorRole} cannot drag tasks from stage "${fromStage.name}"`, 403);
        }
        if (actorRole && !(0, workflow_stages_1.canDragStage)({
            category: toStage.settings?.category,
            settings: toStage.settings,
        }, actorRole) && !workflow_stages_1.ELEVATED_PROJECT_ROLES.includes(actorRole)) {
            throw new errorHandler_1.ApiError(`Role ${actorRole} cannot drop tasks onto stage "${toStage.name}"`, 403);
        }
        // Execute onExit hook for current stage
        await this.executeOnExit(task, fromStage);
        // Update task
        const oldStageId = task.stageId;
        task.stageId = toStageId;
        task.stage = toStage;
        // Update status based on stage
        if (toStage.isFinal) {
            task.status = Task_1.TaskStatus.DONE;
            task.completedAt = new Date();
            task.completionPercentage = 100;
        }
        else if (toStage.isDefault) {
            task.status = Task_1.TaskStatus.TODO;
            task.completedAt = undefined;
        }
        else {
            task.status = Task_1.TaskStatus.IN_PROGRESS;
            task.completedAt = undefined;
        }
        // QA / tester send-back → development: persist sprint return ledger
        const fromCategory = (fromStage.settings?.category || "").toLowerCase();
        const toCategory = (toStage.settings?.category || "").toLowerCase();
        const isSendBackToDev = toCategory === "development" &&
            (fromCategory === "testing" || fromCategory === "qa" || fromCategory === "devops");
        if (isSendBackToDev) {
            const meta = { ...(task.metadata || {}) };
            meta.qaReturnCount = (meta.qaReturnCount || 0) + 1;
            meta.qaReturns = [
                ...(meta.qaReturns || []),
                {
                    fromStageId: oldStageId,
                    fromStageName: fromStage.name,
                    toStageId,
                    toStageName: toStage.name,
                    at: new Date().toISOString(),
                    by: userId,
                    returnedTo: "developer",
                },
            ];
            meta.live = false;
            task.metadata = meta;
        }
        const savedTask = await this.taskRepo.save(task);
        // Execute onEnter hook for new stage
        await this.executeOnEnter(savedTask, toStage);
        // Auto-generate worklog when task reaches final stage
        if (toStage.isFinal) {
            try {
                await WorklogService_1.worklogService.createFromTaskCompletion(savedTask, userId);
            }
            catch (err) {
                console.warn("Auto worklog creation skipped:", err.message);
            }
        }
        // Log activity
        const activity = this.activityRepo.create({
            taskId,
            userId,
            type: TaskActivity_1.TaskActivityType.STAGE_CHANGED,
            description: `Moved from "${fromStage.name}" to "${toStage.name}"`,
            details: {
                fromStageId: oldStageId,
                toStageId,
                fromStageName: fromStage.name,
                toStageName: toStage.name
            }
        });
        const savedActivity = await this.activityRepo.save(activity);
        return {
            success: true,
            task: savedTask,
            fromStage,
            toStage,
            activity: savedActivity
        };
    }
    /**
     * Resolve the caller's project role for drag ACL (falls back to MEMBER).
     */
    async resolveActorRole(userId, projectId) {
        if (!projectId)
            return workflow_stages_1.PROJECT_ROLE.MEMBER;
        const memberRepo = data_source_1.AppDataSource.getRepository(ProjectMember_1.ProjectMember);
        const member = await memberRepo.findOne({ where: { projectId, userId } });
        if (!member)
            return workflow_stages_1.PROJECT_ROLE.MEMBER;
        const map = {
            [ProjectMember_1.ProjectMemberRole.PROJECT_MANAGER]: workflow_stages_1.PROJECT_ROLE.PROJECT_MANAGER,
            [ProjectMember_1.ProjectMemberRole.TEAM_LEAD]: workflow_stages_1.PROJECT_ROLE.TEAM_LEAD,
            [ProjectMember_1.ProjectMemberRole.FRONTEND]: workflow_stages_1.PROJECT_ROLE.FRONTEND,
            [ProjectMember_1.ProjectMemberRole.BACKEND]: workflow_stages_1.PROJECT_ROLE.BACKEND,
            [ProjectMember_1.ProjectMemberRole.TESTER]: workflow_stages_1.PROJECT_ROLE.TESTER,
            [ProjectMember_1.ProjectMemberRole.DEVOPS]: workflow_stages_1.PROJECT_ROLE.DEVOPS,
            [ProjectMember_1.ProjectMemberRole.MEMBER]: workflow_stages_1.PROJECT_ROLE.MEMBER,
        };
        return map[member.role] || workflow_stages_1.PROJECT_ROLE.MEMBER;
    }
    /**
     * Mark a completed task as live (released).
     */
    async markLive(taskId, userId) {
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task)
            throw new errorHandler_1.ApiError("Task not found", 404);
        if (task.status !== Task_1.TaskStatus.DONE) {
            throw new errorHandler_1.ApiError("Only completed tasks can be marked live", 400);
        }
        const meta = { ...(task.metadata || {}) };
        meta.live = true;
        meta.liveAt = new Date().toISOString();
        task.metadata = meta;
        const saved = await this.taskRepo.save(task);
        await this.activityRepo.save(this.activityRepo.create({
            taskId,
            userId,
            type: TaskActivity_1.TaskActivityType.UPDATED,
            description: "Marked live",
            details: { fieldName: "live", newValue: true },
        }));
        return saved;
    }
    /**
     * Rebug a live/completed task: send back to first development stage, +1 rebug.
     */
    async rebug(taskId, reason, userId) {
        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ["workflow", "workflow.stages", "stage"],
        });
        if (!task)
            throw new errorHandler_1.ApiError("Task not found", 404);
        if (!task.metadata?.live && task.status !== Task_1.TaskStatus.DONE) {
            throw new errorHandler_1.ApiError("Only live or completed tasks can be rebuged", 400);
        }
        if (!task.workflowId) {
            throw new errorHandler_1.ApiError("Task has no workflow", 400);
        }
        const stages = (task.workflow?.stages || []).slice().sort((a, b) => a.order - b.order);
        const devStage = stages.find((s) => (s.settings?.category || "").toLowerCase() === "development") ||
            stages.find((s) => !s.isDefault && !s.isFinal);
        if (!devStage) {
            throw new errorHandler_1.ApiError("No development stage found for rebug", 400);
        }
        const meta = { ...(task.metadata || {}) };
        meta.rebugCount = (meta.rebugCount || 0) + 1;
        meta.live = false;
        task.metadata = meta;
        await this.taskRepo.save(task);
        const actorRole = userId
            ? await this.resolveActorRole(userId, task.projectId)
            : workflow_stages_1.PROJECT_ROLE.TEAM_LEAD;
        // Elevated role so rebug can always move back to development
        return this.transitionTask(taskId, devStage.id, userId, workflow_stages_1.ELEVATED_PROJECT_ROLES.includes(actorRole) ? actorRole : workflow_stages_1.PROJECT_ROLE.TEAM_LEAD);
    }
    /**
     * Validate if transition is allowed
     */
    async validateTransition(workflow, fromStage, toStage) {
        // If no transitions defined, allow all
        if (!workflow.transitions?.length) {
            // By default, allow forward and backward if configured
            const allowBackward = workflow.settings?.allowBackwardTransition ?? true;
            if (!allowBackward && toStage.order < fromStage.order) {
                return false;
            }
            return true;
        }
        // Check defined transitions
        return workflow.transitions.some(t => t.fromStageId === fromStage.id && t.toStageId === toStage.id);
    }
    /**
     * Execute onExit hook
     */
    async executeOnExit(task, stage) {
        // Placeholder for stage exit logic
        // Can be extended for notifications, validations, etc.
        if (stage.settings?.notifyOnExit) {
            // Emit notification event
            console.log(`Task ${task.id} exiting stage ${stage.name}`);
        }
    }
    /**
     * Execute onEnter hook
     */
    async executeOnEnter(task, stage) {
        // Placeholder for stage enter logic
        if (stage.settings?.notifyOnEntry) {
            console.log(`Task ${task.id} entering stage ${stage.name}`);
        }
        // Auto-assign if configured
        if (stage.settings?.autoAssignTo && !task.assigneeId) {
            task.assigneeId = stage.settings.autoAssignTo;
            await this.taskRepo.save(task);
        }
    }
    /**
     * Generate default linear transitions
     */
    generateDefaultTransitions(stages) {
        const transitions = [];
        const sortedStages = [...stages].sort((a, b) => a.order - b.order);
        for (let i = 0; i < sortedStages.length - 1; i++) {
            // Forward transition
            transitions.push({
                fromStageId: sortedStages[i].id,
                toStageId: sortedStages[i + 1].id
            });
            // Backward transition
            transitions.push({
                fromStageId: sortedStages[i + 1].id,
                toStageId: sortedStages[i].id
            });
        }
        return transitions;
    }
    /**
     * Get stage statistics for a workflow
     */
    async getWorkflowStats(workflowId) {
        const workflow = await this.getWorkflowById(workflowId);
        if (!workflow) {
            throw new errorHandler_1.ApiError("Workflow not found", 404);
        }
        const stats = await Promise.all(workflow.stages.map(async (stage) => {
            const [taskCount, completedCount] = await Promise.all([
                this.taskRepo.count({ where: { stageId: stage.id } }),
                this.taskRepo.count({ where: { stageId: stage.id, status: Task_1.TaskStatus.DONE } })
            ]);
            return {
                stageId: stage.id,
                stageName: stage.name,
                taskCount,
                completedCount
            };
        }));
        return stats;
    }
    // ─────────────────────────────────────────────────
    // STAGE VISIBILITY & MEMBER MANAGEMENT
    // ─────────────────────────────────────────────────
    /**
     * Update stage visibility (TEAM_ONLY | PROJECT_WIDE)
     */
    async updateStageVisibility(stageId, visibility) {
        const stage = await this.stageRepo.findOne({ where: { id: stageId } });
        if (!stage)
            throw new errorHandler_1.ApiError("Stage not found", 404);
        stage.visibility = visibility;
        return this.stageRepo.save(stage);
    }
    /**
     * Add member(s) to a stage (for TEAM_ONLY visibility)
     */
    async addStageMembers(stageId, userIds) {
        const stage = await this.stageRepo.findOne({ where: { id: stageId } });
        if (!stage)
            throw new errorHandler_1.ApiError("Stage not found", 404);
        const existing = await this.stageMemberRepo.find({ where: { stageId } });
        const existingSet = new Set(existing.map((m) => m.userId));
        const newMembers = userIds
            .filter((id) => !existingSet.has(id))
            .map((userId) => this.stageMemberRepo.create({ stageId, userId }));
        if (newMembers.length === 0)
            return existing;
        const saved = await this.stageMemberRepo.save(newMembers);
        return [...existing, ...saved];
    }
    /**
     * Remove a member from a stage
     */
    async removeStageMember(stageId, userId) {
        const member = await this.stageMemberRepo.findOne({
            where: { stageId, userId },
        });
        if (!member)
            throw new errorHandler_1.ApiError("Stage member not found", 404);
        await this.stageMemberRepo.remove(member);
    }
    /**
     * List members of a stage
     */
    async getStageMembers(stageId) {
        return this.stageMemberRepo.find({
            where: { stageId },
            relations: ["user"],
        });
    }
    /**
     * Check if a user can view a stage based on visibility rules.
     * canViewStageForUser(userId, stage) =
     *   user.roleLevel IN (TEAM_LEAD, PROJECT_MANAGER, ORG_CREATOR)
     *   OR stage.visibility == PROJECT_WIDE
     *   OR user.id IN stage.members
     */
    async canUserViewStage(userId, stageId, isElevatedRole) {
        if (isElevatedRole)
            return true;
        const stage = await this.stageRepo.findOne({ where: { id: stageId } });
        if (!stage)
            return false;
        if (stage.visibility === WorkflowStage_1.StageVisibility.PROJECT_WIDE)
            return true;
        // TEAM_ONLY — check membership
        const member = await this.stageMemberRepo.findOne({
            where: { stageId, userId },
        });
        return !!member;
    }
    /**
     * Filter stages of a workflow based on user visibility.
     * Returns only visually accessible stages for the user.
     */
    async getVisibleStagesForUser(workflowId, userId, isElevatedRole) {
        const workflow = await this.workflowRepo.findOne({
            where: { id: workflowId },
            relations: ["stages", "stages.stageMembers"],
            order: { stages: { order: "ASC" } },
        });
        if (!workflow)
            throw new errorHandler_1.ApiError("Workflow not found", 404);
        if (isElevatedRole)
            return workflow.stages;
        return workflow.stages.filter((stage) => {
            if (stage.visibility === WorkflowStage_1.StageVisibility.PROJECT_WIDE)
                return true;
            // TEAM_ONLY — check if user is in stage members
            return stage.stageMembers?.some((m) => m.userId === userId);
        });
    }
}
exports.WorkflowEngine = WorkflowEngine;
// Export singleton instance
exports.workflowEngine = new WorkflowEngine();
