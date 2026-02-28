"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowEngine = exports.WorkflowEngine = exports.DEFAULT_WORKFLOW_STAGES = void 0;
const data_source_1 = require("../config/data-source");
const Workflow_1 = require("../entities/Workflow");
const WorkflowStage_1 = require("../entities/WorkflowStage");
const Task_1 = require("../entities/Task");
const TaskActivity_1 = require("../entities/TaskActivity");
const errorHandler_1 = require("../middlewares/errorHandler");
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
            isDefault: false,
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
     * Get workflow with stages
     */
    async getWorkflowById(workflowId) {
        return this.workflowRepo.findOne({
            where: { id: workflowId },
            relations: ["stages"],
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
    async transitionTask(taskId, toStageId, userId) {
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
        const savedTask = await this.taskRepo.save(task);
        // Execute onEnter hook for new stage
        await this.executeOnEnter(savedTask, toStage);
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
}
exports.WorkflowEngine = WorkflowEngine;
// Export singleton instance
exports.workflowEngine = new WorkflowEngine();
