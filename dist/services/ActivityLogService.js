"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogService = void 0;
const data_source_1 = require("../config/data-source");
const ActivityLog_1 = require("../entities/ActivityLog");
class ActivityLogService {
    constructor() {
        this.logRepo = data_source_1.AppDataSource.getRepository(ActivityLog_1.ActivityLog);
    }
    async log(input) {
        const payload = {
            action: input.action,
            details: input.details
        };
        if (input.teamId)
            payload.team = { id: input.teamId };
        if (input.actorId)
            payload.actor = { id: input.actorId };
        if (input.targetUserId)
            payload.targetUser = { id: input.targetUserId };
        if (input.taskId)
            payload.task = { id: input.taskId };
        const activity = this.logRepo.create(payload);
        return this.logRepo.save(activity);
    }
    async getTeamActivity(teamId, limit = 50) {
        return this.logRepo.find({
            where: { team: { id: teamId } },
            relations: ["actor", "targetUser", "task"],
            order: { createdAt: "DESC" },
            take: limit
        });
    }
}
exports.ActivityLogService = ActivityLogService;
