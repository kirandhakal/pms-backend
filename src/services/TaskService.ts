import { AppDataSource } from "../config/data-source";
import { Task, TaskStatus } from "../entities/Task";
import { Comment } from "../entities/Comment";
import { User } from "../entities/User";

export class TaskService {
    private taskRepo = AppDataSource.getRepository(Task);
    private commentRepo = AppDataSource.getRepository(Comment);

    async createTask(data: any) {
        const task = this.taskRepo.create(data);
        return await this.taskRepo.save(task);
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, completion?: number) {
        const task = await this.taskRepo.findOneBy({ id: taskId });
        if (!task) throw new Error("Task not found");

        task.status = status;
        if (completion !== undefined) task.completionPercentage = completion;
        if (status === TaskStatus.DONE) {
            task.completedAt = new Date();
            task.completionPercentage = 100;
        }

        return await this.taskRepo.save(task);
    }

    async getUserProgress(userId: string) {
        const tasks = await this.taskRepo.find({ where: { assignedUser: { id: userId } } });
        const total = tasks.length;
        const completed = tasks.filter((t: any) => t.status === TaskStatus.DONE).length;

        return {
            userId,
            totalTasks: total,
            completedTasks: completed,
            overallCompletion: total > 0 ? Math.round((completed / total) * 100) : 0,
            tasks: tasks.map((t: any) => ({
                id: t.id,
                name: t.name,
                status: t.status,
                completion: t.completionPercentage,
                updatedAt: t.updatedAt
            }))
        };
    }

    async addComment(taskId: string, userId: string, content: string) {
        const task = await this.taskRepo.findOneBy({ id: taskId });
        if (!task) throw new Error("Task not found");

        const comment = this.commentRepo.create({
            content,
            task,
            user: { id: userId } as User
        });

        return await this.commentRepo.save(comment);
    }
}
