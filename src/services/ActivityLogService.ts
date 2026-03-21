import { AppDataSource } from "../config/data-source";
import { ActivityAction, ActivityLog } from "../entities/ActivityLog";
import { Task } from "../entities/Task";
import { Team } from "../entities/Team";
import { User } from "../entities/User";

interface LogInput {
    action: ActivityAction;
    teamId?: string;
    actorId?: string;
    targetUserId?: string;
    taskId?: string;
    details?: string;
}

export class ActivityLogService {
    private logRepo = AppDataSource.getRepository(ActivityLog);

    async log(input: LogInput) {
        const payload: Partial<ActivityLog> = {
            action: input.action,
            details: input.details
        };

        if (input.teamId) payload.team = { id: input.teamId } as Team;
        if (input.actorId) payload.actor = { id: input.actorId } as User;
        if (input.targetUserId) payload.targetUser = { id: input.targetUserId } as User;
        if (input.taskId) payload.task = { id: input.taskId } as Task;

        const activity = this.logRepo.create(payload);
        return this.logRepo.save(activity);
    }

    async getTeamActivity(teamId: string, limit = 50) {
        return this.logRepo.find({
            where: { team: { id: teamId } },
            relations: ["actor", "targetUser", "task"],
            order: { createdAt: "DESC" },
            take: limit
        });
    }
}
