"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingService = exports.MeetingService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const data_source_1 = require("../config/data-source");
const Meeting_1 = require("../entities/Meeting");
const MeetingParticipant_1 = require("../entities/MeetingParticipant");
const MeetingNote_1 = require("../entities/MeetingNote");
const MinutesOfMeeting_1 = require("../entities/MinutesOfMeeting");
const MomActionItem_1 = require("../entities/MomActionItem");
const Task_1 = require("../entities/Task");
const errorHandler_1 = require("../middlewares/errorHandler");
const ChannelService_1 = require("./ChannelService");
class MeetingService {
    constructor() {
        this.meetingRepo = data_source_1.AppDataSource.getRepository(Meeting_1.Meeting);
        this.participantRepo = data_source_1.AppDataSource.getRepository(MeetingParticipant_1.MeetingParticipant);
        this.noteRepo = data_source_1.AppDataSource.getRepository(MeetingNote_1.MeetingNote);
        this.momRepo = data_source_1.AppDataSource.getRepository(MinutesOfMeeting_1.MinutesOfMeeting);
        this.actionItemRepo = data_source_1.AppDataSource.getRepository(MomActionItem_1.MomActionItem);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
    }
    frontendBaseUrl() {
        return (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
    }
    /** Normalize topic to a short standard slug prefix */
    topicPrefix(topic) {
        const raw = (topic || "meet").toLowerCase().replace(/[^a-z0-9]+/g, "");
        const known = ["standup", "planning", "general", "project", "personal", "other", "meet"];
        if (known.includes(raw))
            return raw.slice(0, 8);
        return (raw.slice(0, 8) || "meet");
    }
    /** Short slug: standup-k7m2 */
    async makeInviteSlug(topic) {
        const prefix = this.topicPrefix(topic);
        for (let i = 0; i < 12; i++) {
            const suffix = crypto_1.default.randomBytes(2).toString("hex"); // 4 hex chars
            const slug = `${prefix}-${suffix}`;
            const exists = await this.meetingRepo.findOne({ where: { inviteSlug: slug } });
            if (!exists)
                return slug;
        }
        return `${prefix}-${crypto_1.default.randomBytes(3).toString("hex")}`;
    }
    async createMeeting(data) {
        const isPersonal = data.isPersonal || !data.organizationId;
        const visibility = data.visibility || Meeting_1.MeetingVisibility.PRIVATE;
        const topic = data.topic || (data.projectId ? "project" : isPersonal ? "personal" : "general");
        const allowGuestJoin = visibility === Meeting_1.MeetingVisibility.PUBLIC ? !!data.allowGuestJoin : false;
        const inviteSlug = await this.makeInviteSlug(topic);
        const meeting = this.meetingRepo.create({
            organizationId: isPersonal ? undefined : data.organizationId,
            projectId: data.projectId,
            channelId: data.channelId,
            title: data.title,
            topic,
            agenda: data.agenda,
            scheduledAt: new Date(data.scheduledAt),
            durationMins: data.durationMins ?? 30,
            createdById: data.createdById,
            status: Meeting_1.MeetingStatus.SCHEDULED,
            visibility,
            allowGuestJoin,
            inviteSlug,
        });
        const saved = await this.meetingRepo.save(meeting);
        await this.participantRepo.save(this.participantRepo.create({
            meetingId: saved.id,
            userId: data.createdById,
            isOrganizer: true,
        }));
        if (data.participantIds?.length) {
            const participants = data.participantIds
                .filter((id) => id !== data.createdById)
                .map((userId) => this.participantRepo.create({
                meetingId: saved.id,
                userId,
                isOrganizer: false,
            }));
            if (participants.length)
                await this.participantRepo.save(participants);
        }
        return this.getMeetingById(saved.id);
    }
    async getMeetingById(id) {
        return this.meetingRepo.findOne({
            where: { id },
            relations: [
                "participants",
                "participants.user",
                "notes",
                "notes.author",
                "mom",
                "mom.actionItems",
                "project",
                "channel",
                "createdBy",
            ],
        });
    }
    /**
     * List meetings for org and/or personal scope with optional filters.
     */
    async listMeetings(filters) {
        const qb = this.meetingRepo
            .createQueryBuilder("m")
            .leftJoinAndSelect("m.participants", "p")
            .leftJoinAndSelect("p.user", "pu")
            .leftJoinAndSelect("m.createdBy", "creator")
            .leftJoinAndSelect("m.project", "project")
            .orderBy("m.scheduledAt", "DESC");
        if (filters.personalOnly || (!filters.organizationId && filters.userId)) {
            // Personal: created by user OR user is participant, no org
            qb.andWhere("m.organizationId IS NULL").andWhere("(m.createdById = :userId OR p.userId = :userId)", { userId: filters.userId });
        }
        else if (filters.organizationId) {
            qb.andWhere("m.organizationId = :organizationId", {
                organizationId: filters.organizationId,
            });
        }
        if (filters.projectId) {
            qb.andWhere("m.projectId = :projectId", { projectId: filters.projectId });
        }
        if (filters.topic) {
            if (filters.topic === "other") {
                qb.andWhere("(m.topic IS NULL OR m.topic NOT IN (:...known))", {
                    known: ["project", "personal", "standup", "planning", "general"],
                });
            }
            else {
                qb.andWhere("m.topic = :topic", { topic: filters.topic });
            }
        }
        if (filters.status === "HISTORY") {
            qb.andWhere("m.status IN (:...statuses)", {
                statuses: [Meeting_1.MeetingStatus.COMPLETED, Meeting_1.MeetingStatus.CANCELLED],
            });
        }
        else if (filters.status === "UPCOMING") {
            qb.andWhere("m.status IN (:...statuses)", {
                statuses: [Meeting_1.MeetingStatus.SCHEDULED, Meeting_1.MeetingStatus.IN_PROGRESS],
            });
        }
        else if (filters.status) {
            qb.andWhere("m.status = :status", { status: filters.status });
        }
        return qb.getMany();
    }
    async getMeetingsByOrganization(organizationId, projectId) {
        return this.listMeetings({
            organizationId,
            projectId,
            userId: "", // unused when org set
        });
    }
    async updateMeeting(id, data) {
        const meeting = await this.meetingRepo.findOne({ where: { id } });
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        if (data.title !== undefined)
            meeting.title = data.title;
        if (data.topic !== undefined)
            meeting.topic = data.topic;
        if (data.agenda !== undefined)
            meeting.agenda = data.agenda;
        if (data.scheduledAt !== undefined)
            meeting.scheduledAt = new Date(data.scheduledAt);
        if (data.durationMins !== undefined)
            meeting.durationMins = data.durationMins;
        if (data.channelId !== undefined)
            meeting.channelId = data.channelId;
        if (data.projectId !== undefined)
            meeting.projectId = data.projectId;
        if (data.visibility !== undefined) {
            meeting.visibility = data.visibility;
            if (data.visibility === Meeting_1.MeetingVisibility.PRIVATE) {
                meeting.allowGuestJoin = false;
            }
            if (!meeting.inviteSlug) {
                meeting.inviteSlug = await this.makeInviteSlug(meeting.topic);
            }
        }
        if (data.allowGuestJoin !== undefined) {
            meeting.allowGuestJoin =
                meeting.visibility === Meeting_1.MeetingVisibility.PUBLIC ? data.allowGuestJoin : false;
        }
        await this.meetingRepo.save(meeting);
        return this.getMeetingById(id);
    }
    async updateMeetingStatus(id, status) {
        const meeting = await this.meetingRepo.findOne({ where: { id } });
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        const validTransitions = {
            [Meeting_1.MeetingStatus.SCHEDULED]: [Meeting_1.MeetingStatus.IN_PROGRESS, Meeting_1.MeetingStatus.CANCELLED],
            [Meeting_1.MeetingStatus.IN_PROGRESS]: [Meeting_1.MeetingStatus.COMPLETED, Meeting_1.MeetingStatus.CANCELLED],
            [Meeting_1.MeetingStatus.COMPLETED]: [],
            [Meeting_1.MeetingStatus.CANCELLED]: [],
        };
        if (!validTransitions[meeting.status].includes(status)) {
            throw new errorHandler_1.ApiError(`Cannot transition from ${meeting.status} to ${status}`, 400);
        }
        meeting.status = status;
        await this.meetingRepo.save(meeting);
        return this.getMeetingById(id);
    }
    getInviteLink(meeting) {
        if (!meeting.inviteSlug)
            return null;
        return `${this.frontendBaseUrl()}/m/${meeting.inviteSlug}`;
    }
    async getMeetingBySlug(slug) {
        return this.meetingRepo.findOne({
            where: { inviteSlug: slug },
            relations: ["participants", "participants.user", "createdBy", "project"],
        });
    }
    /** @deprecated use getMeetingBySlug */
    async getMeetingByInviteToken(token) {
        return this.getMeetingBySlug(token);
    }
    async getPublicPreview(slug) {
        const meeting = await this.getMeetingBySlug(slug);
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        if (meeting.visibility !== Meeting_1.MeetingVisibility.PUBLIC) {
            throw new errorHandler_1.ApiError("This meeting is private", 403);
        }
        return {
            slug: meeting.inviteSlug,
            title: meeting.title,
            topic: meeting.topic,
            agenda: meeting.agenda,
            scheduledAt: meeting.scheduledAt,
            durationMins: meeting.durationMins,
            status: meeting.status,
            visibility: meeting.visibility,
            allowGuestJoin: meeting.allowGuestJoin,
            organizer: meeting.createdBy
                ? { fullName: meeting.createdBy.fullName }
                : null,
            participantCount: meeting.participants?.length ?? 0,
        };
    }
    /**
     * Join as authenticated user via short public slug.
     */
    async joinViaSlug(userId, slug) {
        const meeting = await this.getMeetingBySlug(slug);
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        if (meeting.status === Meeting_1.MeetingStatus.COMPLETED ||
            meeting.status === Meeting_1.MeetingStatus.CANCELLED) {
            throw new errorHandler_1.ApiError("This meeting has ended", 400);
        }
        if (meeting.visibility !== Meeting_1.MeetingVisibility.PUBLIC) {
            throw new errorHandler_1.ApiError("This meeting is private. Ask the organizer to invite you.", 403);
        }
        const existing = await this.participantRepo.findOne({
            where: { meetingId: meeting.id, userId },
        });
        if (existing) {
            return this.getMeetingById(meeting.id);
        }
        await this.participantRepo.save(this.participantRepo.create({
            meetingId: meeting.id,
            userId,
            isOrganizer: false,
        }));
        return this.getMeetingById(meeting.id);
    }
    /**
     * Guest join (no account) — only when allowGuestJoin is true.
     */
    async joinAsGuest(slug, data) {
        const meeting = await this.getMeetingBySlug(slug);
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        if (meeting.visibility !== Meeting_1.MeetingVisibility.PUBLIC || !meeting.allowGuestJoin) {
            throw new errorHandler_1.ApiError("Guest join is not enabled for this meeting. Please sign in.", 403);
        }
        if (meeting.status === Meeting_1.MeetingStatus.COMPLETED ||
            meeting.status === Meeting_1.MeetingStatus.CANCELLED) {
            throw new errorHandler_1.ApiError("This meeting has ended", 400);
        }
        const name = data.name.trim();
        if (!name)
            throw new errorHandler_1.ApiError("Name is required", 400);
        const email = data.email?.trim().toLowerCase() || undefined;
        if (email) {
            const existingGuest = await this.participantRepo.findOne({
                where: { meetingId: meeting.id, guestEmail: email },
            });
            if (existingGuest) {
                return {
                    meeting: (await this.getMeetingById(meeting.id)),
                    guest: { name: existingGuest.guestName || name, email },
                };
            }
        }
        await this.participantRepo.save(this.participantRepo.create({
            meetingId: meeting.id,
            guestName: name,
            guestEmail: email,
            isOrganizer: false,
        }));
        return {
            meeting: (await this.getMeetingById(meeting.id)),
            guest: { name, email },
        };
    }
    /** @deprecated */
    async joinViaInviteToken(userId, token) {
        return this.joinViaSlug(userId, token);
    }
    async regenerateInviteLink(meetingId, options = {}) {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        if (options.makePublic !== false) {
            meeting.visibility = Meeting_1.MeetingVisibility.PUBLIC;
        }
        if (options.allowGuestJoin !== undefined) {
            meeting.allowGuestJoin =
                meeting.visibility === Meeting_1.MeetingVisibility.PUBLIC ? options.allowGuestJoin : false;
        }
        meeting.inviteSlug = await this.makeInviteSlug(meeting.topic);
        await this.meetingRepo.save(meeting);
        const full = (await this.getMeetingById(meetingId));
        return { inviteUrl: this.getInviteLink(full), meeting: full };
    }
    async addParticipants(meetingId, userIds) {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        const existing = await this.participantRepo.find({ where: { meetingId } });
        const existingUserIds = new Set(existing.map((p) => p.userId));
        const newParticipants = userIds
            .filter((id) => !existingUserIds.has(id))
            .map((userId) => this.participantRepo.create({
            meetingId,
            userId,
            isOrganizer: false,
        }));
        if (newParticipants.length === 0)
            return existing;
        const saved = await this.participantRepo.save(newParticipants);
        return [...existing, ...saved];
    }
    async removeParticipant(meetingId, userId) {
        const participant = await this.participantRepo.findOne({
            where: { meetingId, userId },
        });
        if (!participant)
            throw new errorHandler_1.ApiError("Participant not found", 404);
        if (participant.isOrganizer) {
            throw new errorHandler_1.ApiError("Cannot remove the organizer", 400);
        }
        await this.participantRepo.remove(participant);
    }
    async markAttendance(meetingId, userId, attended) {
        const participant = await this.participantRepo.findOne({
            where: { meetingId, userId },
        });
        if (!participant)
            throw new errorHandler_1.ApiError("Participant not found", 404);
        participant.attended = attended;
        return this.participantRepo.save(participant);
    }
    async addNote(meetingId, authorId, content) {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        const note = this.noteRepo.create({ meetingId, authorId, content });
        return this.noteRepo.save(note);
    }
    async getNotes(meetingId) {
        return this.noteRepo.find({
            where: { meetingId },
            relations: ["author"],
            order: { createdAt: "ASC" },
        });
    }
    async generateMom(meetingId, generatedById, data) {
        const meeting = await this.meetingRepo.findOne({
            where: { id: meetingId },
            relations: ["mom"],
        });
        if (!meeting)
            throw new errorHandler_1.ApiError("Meeting not found", 404);
        if (meeting.mom) {
            throw new errorHandler_1.ApiError("MOM already exists for this meeting. Use update instead.", 409);
        }
        const mom = this.momRepo.create({
            meetingId,
            summary: data.summary,
            decisions: data.decisions,
            generatedById,
            isAutoDrafted: false,
        });
        const savedMom = await this.momRepo.save(mom);
        if (data.actionItems?.length) {
            const items = data.actionItems.map((item) => this.actionItemRepo.create({
                momId: savedMom.id,
                description: item.description,
                assigneeId: item.assigneeId,
                dueDate: item.dueDate,
                status: MomActionItem_1.MomActionItemStatus.OPEN,
            }));
            await this.actionItemRepo.save(items);
            if (data.convertActionItemsToTasks && data.projectId) {
                const created = await this.actionItemRepo.find({ where: { momId: savedMom.id } });
                for (const item of created) {
                    try {
                        await this.convertActionItemToTask(item.id, data.projectId, generatedById);
                    }
                    catch {
                        // skip
                    }
                }
            }
        }
        const shouldPost = data.postToChannel !== false && meeting.channelId;
        if (shouldPost && meeting.channelId) {
            try {
                const actionLines = data.actionItems?.map((a, i) => `${i + 1}. ${a.description}`).join("\n") ||
                    "None";
                const body = [
                    `📋 **Minutes of Meeting: ${meeting.title}**`,
                    "",
                    `**Summary**`,
                    data.summary,
                    data.decisions ? `\n**Decisions**\n${data.decisions}` : "",
                    `\n**Action Items**\n${actionLines}`,
                ]
                    .filter(Boolean)
                    .join("\n");
                await ChannelService_1.channelService.sendMessage(generatedById, meeting.channelId, body);
            }
            catch (err) {
                console.warn("MOM channel post skipped:", err.message);
            }
        }
        return this.getMom(meetingId);
    }
    async getMom(meetingId) {
        return this.momRepo.findOne({
            where: { meetingId },
            relations: ["actionItems", "actionItems.assignee", "generatedBy"],
        });
    }
    async updateMom(momId, data) {
        const mom = await this.momRepo.findOne({ where: { id: momId } });
        if (!mom)
            throw new errorHandler_1.ApiError("MOM not found", 404);
        Object.assign(mom, data);
        return this.momRepo.save(mom);
    }
    async addActionItem(momId, data) {
        const mom = await this.momRepo.findOne({ where: { id: momId } });
        if (!mom)
            throw new errorHandler_1.ApiError("MOM not found", 404);
        const item = this.actionItemRepo.create({
            momId,
            description: data.description,
            assigneeId: data.assigneeId,
            dueDate: data.dueDate,
            status: MomActionItem_1.MomActionItemStatus.OPEN,
        });
        return this.actionItemRepo.save(item);
    }
    async updateActionItem(actionItemId, data) {
        const item = await this.actionItemRepo.findOne({ where: { id: actionItemId } });
        if (!item)
            throw new errorHandler_1.ApiError("Action item not found", 404);
        Object.assign(item, data);
        return this.actionItemRepo.save(item);
    }
    async convertActionItemToTask(actionItemId, projectId, createdById) {
        const item = await this.actionItemRepo.findOne({
            where: { id: actionItemId },
            relations: ["mom", "mom.meeting"],
        });
        if (!item)
            throw new errorHandler_1.ApiError("Action item not found", 404);
        if (item.convertedTaskId) {
            throw new errorHandler_1.ApiError("Action item has already been converted to a task", 409);
        }
        const task = this.taskRepo.create({
            name: item.description.slice(0, 255),
            description: `[From MOM] ${item.description}`,
            status: Task_1.TaskStatus.TODO,
            projectId,
            assigneeId: item.assigneeId ?? undefined,
            createdById,
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        });
        const savedTask = await this.taskRepo.save(task);
        item.convertedTaskId = savedTask.id;
        const updatedItem = await this.actionItemRepo.save(item);
        return { actionItem: updatedItem, task: savedTask };
    }
}
exports.MeetingService = MeetingService;
exports.meetingService = new MeetingService();
