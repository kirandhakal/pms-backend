import crypto from "crypto";
import { AppDataSource } from "../config/data-source";
import { Meeting, MeetingStatus, MeetingVisibility } from "../entities/Meeting";
import { MeetingParticipant } from "../entities/MeetingParticipant";
import { MeetingNote } from "../entities/MeetingNote";
import { MinutesOfMeeting } from "../entities/MinutesOfMeeting";
import { MomActionItem, MomActionItemStatus } from "../entities/MomActionItem";
import { Task, TaskStatus } from "../entities/Task";
import { ApiError } from "../middlewares/errorHandler";
import { channelService } from "./ChannelService";

export class MeetingService {
    private meetingRepo = AppDataSource.getRepository(Meeting);
    private participantRepo = AppDataSource.getRepository(MeetingParticipant);
    private noteRepo = AppDataSource.getRepository(MeetingNote);
    private momRepo = AppDataSource.getRepository(MinutesOfMeeting);
    private actionItemRepo = AppDataSource.getRepository(MomActionItem);
    private taskRepo = AppDataSource.getRepository(Task);

    private frontendBaseUrl() {
        return (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(
            /\/$/,
            ""
        );
    }

    /** Normalize topic to a short standard slug prefix */
    private topicPrefix(topic?: string): string {
        const raw = (topic || "meet").toLowerCase().replace(/[^a-z0-9]+/g, "");
        const known = ["standup", "planning", "general", "project", "personal", "other", "meet"];
        if (known.includes(raw)) return raw.slice(0, 8);
        return (raw.slice(0, 8) || "meet");
    }

    /** Short slug: standup-k7m2 */
    private async makeInviteSlug(topic?: string): Promise<string> {
        const prefix = this.topicPrefix(topic);
        for (let i = 0; i < 12; i++) {
            const suffix = crypto.randomBytes(2).toString("hex"); // 4 hex chars
            const slug = `${prefix}-${suffix}`;
            const exists = await this.meetingRepo.findOne({ where: { inviteSlug: slug } });
            if (!exists) return slug;
        }
        return `${prefix}-${crypto.randomBytes(3).toString("hex")}`;
    }

    async createMeeting(data: {
        organizationId?: string;
        projectId?: string;
        channelId?: string;
        title: string;
        topic?: string;
        agenda?: string;
        scheduledAt: Date | string;
        durationMins?: number;
        createdById: string;
        participantIds?: string[];
        visibility?: MeetingVisibility;
        allowGuestJoin?: boolean;
        isPersonal?: boolean;
    }): Promise<Meeting> {
        const isPersonal = data.isPersonal || !data.organizationId;
        const visibility = data.visibility || MeetingVisibility.PRIVATE;
        const topic =
            data.topic || (data.projectId ? "project" : isPersonal ? "personal" : "general");
        const allowGuestJoin =
            visibility === MeetingVisibility.PUBLIC ? !!data.allowGuestJoin : false;
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
            status: MeetingStatus.SCHEDULED,
            visibility,
            allowGuestJoin,
            inviteSlug,
        });

        const saved = await this.meetingRepo.save(meeting);

        await this.participantRepo.save(
            this.participantRepo.create({
                meetingId: saved.id,
                userId: data.createdById,
                isOrganizer: true,
            })
        );

        if (data.participantIds?.length) {
            const participants = data.participantIds
                .filter((id) => id !== data.createdById)
                .map((userId) =>
                    this.participantRepo.create({
                        meetingId: saved.id,
                        userId,
                        isOrganizer: false,
                    })
                );
            if (participants.length) await this.participantRepo.save(participants);
        }

        return this.getMeetingById(saved.id) as Promise<Meeting>;
    }

    async getMeetingById(id: string): Promise<Meeting | null> {
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
    async listMeetings(filters: {
        organizationId?: string;
        projectId?: string;
        topic?: string;
        status?: MeetingStatus | "HISTORY" | "UPCOMING";
        userId: string;
        personalOnly?: boolean;
    }): Promise<Meeting[]> {
        const qb = this.meetingRepo
            .createQueryBuilder("m")
            .leftJoinAndSelect("m.participants", "p")
            .leftJoinAndSelect("p.user", "pu")
            .leftJoinAndSelect("m.createdBy", "creator")
            .leftJoinAndSelect("m.project", "project")
            .orderBy("m.scheduledAt", "DESC");

        if (filters.personalOnly || (!filters.organizationId && filters.userId)) {
            // Personal: created by user OR user is participant, no org
            qb.andWhere("m.organizationId IS NULL").andWhere(
                "(m.createdById = :userId OR p.userId = :userId)",
                { userId: filters.userId }
            );
        } else if (filters.organizationId) {
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
            } else {
                qb.andWhere("m.topic = :topic", { topic: filters.topic });
            }
        }

        if (filters.status === "HISTORY") {
            qb.andWhere("m.status IN (:...statuses)", {
                statuses: [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED],
            });
        } else if (filters.status === "UPCOMING") {
            qb.andWhere("m.status IN (:...statuses)", {
                statuses: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS],
            });
        } else if (filters.status) {
            qb.andWhere("m.status = :status", { status: filters.status });
        }

        return qb.getMany();
    }

    async getMeetingsByOrganization(organizationId: string, projectId?: string): Promise<Meeting[]> {
        return this.listMeetings({
            organizationId,
            projectId,
            userId: "", // unused when org set
        });
    }

    async updateMeeting(
        id: string,
        data: Partial<{
            title: string;
            topic: string;
            agenda: string;
            scheduledAt: Date | string;
            durationMins: number;
            channelId: string;
            projectId: string;
            visibility: MeetingVisibility;
            allowGuestJoin: boolean;
        }>
    ): Promise<Meeting> {
        const meeting = await this.meetingRepo.findOne({ where: { id } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        if (data.title !== undefined) meeting.title = data.title;
        if (data.topic !== undefined) meeting.topic = data.topic;
        if (data.agenda !== undefined) meeting.agenda = data.agenda;
        if (data.scheduledAt !== undefined) meeting.scheduledAt = new Date(data.scheduledAt);
        if (data.durationMins !== undefined) meeting.durationMins = data.durationMins;
        if (data.channelId !== undefined) meeting.channelId = data.channelId;
        if (data.projectId !== undefined) meeting.projectId = data.projectId;
        if (data.visibility !== undefined) {
            meeting.visibility = data.visibility;
            if (data.visibility === MeetingVisibility.PRIVATE) {
                meeting.allowGuestJoin = false;
            }
            if (!meeting.inviteSlug) {
                meeting.inviteSlug = await this.makeInviteSlug(meeting.topic);
            }
        }
        if (data.allowGuestJoin !== undefined) {
            meeting.allowGuestJoin =
                meeting.visibility === MeetingVisibility.PUBLIC ? data.allowGuestJoin : false;
        }

        await this.meetingRepo.save(meeting);
        return this.getMeetingById(id) as Promise<Meeting>;
    }

    async updateMeetingStatus(id: string, status: MeetingStatus): Promise<Meeting> {
        const meeting = await this.meetingRepo.findOne({ where: { id } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const validTransitions: Record<MeetingStatus, MeetingStatus[]> = {
            [MeetingStatus.SCHEDULED]: [MeetingStatus.IN_PROGRESS, MeetingStatus.CANCELLED],
            [MeetingStatus.IN_PROGRESS]: [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED],
            [MeetingStatus.COMPLETED]: [],
            [MeetingStatus.CANCELLED]: [],
        };

        if (!validTransitions[meeting.status].includes(status)) {
            throw new ApiError(`Cannot transition from ${meeting.status} to ${status}`, 400);
        }

        meeting.status = status;
        await this.meetingRepo.save(meeting);
        return this.getMeetingById(id) as Promise<Meeting>;
    }

    getInviteLink(meeting: Meeting): string | null {
        if (!meeting.inviteSlug) return null;
        return `${this.frontendBaseUrl()}/m/${meeting.inviteSlug}`;
    }

    async getMeetingBySlug(slug: string): Promise<Meeting | null> {
        return this.meetingRepo.findOne({
            where: { inviteSlug: slug },
            relations: ["participants", "participants.user", "createdBy", "project"],
        });
    }

    /** @deprecated use getMeetingBySlug */
    async getMeetingByInviteToken(token: string): Promise<Meeting | null> {
        return this.getMeetingBySlug(token);
    }

    async getPublicPreview(slug: string) {
        const meeting = await this.getMeetingBySlug(slug);
        if (!meeting) throw new ApiError("Meeting not found", 404);
        if (meeting.visibility !== MeetingVisibility.PUBLIC) {
            throw new ApiError("This meeting is private", 403);
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
    async joinViaSlug(userId: string, slug: string): Promise<Meeting> {
        const meeting = await this.getMeetingBySlug(slug);
        if (!meeting) throw new ApiError("Meeting not found", 404);

        if (
            meeting.status === MeetingStatus.COMPLETED ||
            meeting.status === MeetingStatus.CANCELLED
        ) {
            throw new ApiError("This meeting has ended", 400);
        }

        if (meeting.visibility !== MeetingVisibility.PUBLIC) {
            throw new ApiError("This meeting is private. Ask the organizer to invite you.", 403);
        }

        const existing = await this.participantRepo.findOne({
            where: { meetingId: meeting.id, userId },
        });
        if (existing) {
            return this.getMeetingById(meeting.id) as Promise<Meeting>;
        }

        await this.participantRepo.save(
            this.participantRepo.create({
                meetingId: meeting.id,
                userId,
                isOrganizer: false,
            })
        );

        return this.getMeetingById(meeting.id) as Promise<Meeting>;
    }

    /**
     * Guest join (no account) — only when allowGuestJoin is true.
     */
    async joinAsGuest(
        slug: string,
        data: { name: string; email?: string }
    ): Promise<{ meeting: Meeting; guest: { name: string; email?: string } }> {
        const meeting = await this.getMeetingBySlug(slug);
        if (!meeting) throw new ApiError("Meeting not found", 404);

        if (meeting.visibility !== MeetingVisibility.PUBLIC || !meeting.allowGuestJoin) {
            throw new ApiError("Guest join is not enabled for this meeting. Please sign in.", 403);
        }

        if (
            meeting.status === MeetingStatus.COMPLETED ||
            meeting.status === MeetingStatus.CANCELLED
        ) {
            throw new ApiError("This meeting has ended", 400);
        }

        const name = data.name.trim();
        if (!name) throw new ApiError("Name is required", 400);
        const email = data.email?.trim().toLowerCase() || undefined;

        if (email) {
            const existingGuest = await this.participantRepo.findOne({
                where: { meetingId: meeting.id, guestEmail: email },
            });
            if (existingGuest) {
                return {
                    meeting: (await this.getMeetingById(meeting.id))!,
                    guest: { name: existingGuest.guestName || name, email },
                };
            }
        }

        await this.participantRepo.save(
            this.participantRepo.create({
                meetingId: meeting.id,
                guestName: name,
                guestEmail: email,
                isOrganizer: false,
            })
        );

        return {
            meeting: (await this.getMeetingById(meeting.id))!,
            guest: { name, email },
        };
    }

    /** @deprecated */
    async joinViaInviteToken(userId: string, token: string): Promise<Meeting> {
        return this.joinViaSlug(userId, token);
    }

    async regenerateInviteLink(
        meetingId: string,
        options: { makePublic?: boolean; allowGuestJoin?: boolean } = {}
    ): Promise<{ inviteUrl: string; meeting: Meeting }> {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        if (options.makePublic !== false) {
            meeting.visibility = MeetingVisibility.PUBLIC;
        }
        if (options.allowGuestJoin !== undefined) {
            meeting.allowGuestJoin =
                meeting.visibility === MeetingVisibility.PUBLIC ? options.allowGuestJoin : false;
        }
        meeting.inviteSlug = await this.makeInviteSlug(meeting.topic);
        await this.meetingRepo.save(meeting);

        const full = (await this.getMeetingById(meetingId))!;
        return { inviteUrl: this.getInviteLink(full)!, meeting: full };
    }

    async addParticipants(meetingId: string, userIds: string[]): Promise<MeetingParticipant[]> {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const existing = await this.participantRepo.find({ where: { meetingId } });
        const existingUserIds = new Set(existing.map((p) => p.userId));

        const newParticipants = userIds
            .filter((id) => !existingUserIds.has(id))
            .map((userId) =>
                this.participantRepo.create({
                    meetingId,
                    userId,
                    isOrganizer: false,
                })
            );

        if (newParticipants.length === 0) return existing;
        const saved = await this.participantRepo.save(newParticipants);
        return [...existing, ...saved];
    }

    async removeParticipant(meetingId: string, userId: string): Promise<void> {
        const participant = await this.participantRepo.findOne({
            where: { meetingId, userId },
        });
        if (!participant) throw new ApiError("Participant not found", 404);
        if (participant.isOrganizer) {
            throw new ApiError("Cannot remove the organizer", 400);
        }
        await this.participantRepo.remove(participant);
    }

    async markAttendance(meetingId: string, userId: string, attended: boolean): Promise<MeetingParticipant> {
        const participant = await this.participantRepo.findOne({
            where: { meetingId, userId },
        });
        if (!participant) throw new ApiError("Participant not found", 404);
        participant.attended = attended;
        return this.participantRepo.save(participant);
    }

    async addNote(meetingId: string, authorId: string, content: string): Promise<MeetingNote> {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting) throw new ApiError("Meeting not found", 404);
        const note = this.noteRepo.create({ meetingId, authorId, content });
        return this.noteRepo.save(note);
    }

    async getNotes(meetingId: string): Promise<MeetingNote[]> {
        return this.noteRepo.find({
            where: { meetingId },
            relations: ["author"],
            order: { createdAt: "ASC" },
        });
    }

    async generateMom(
        meetingId: string,
        generatedById: string,
        data: {
            summary: string;
            decisions?: string;
            actionItems?: Array<{
                description: string;
                assigneeId?: string;
                dueDate?: string;
            }>;
            postToChannel?: boolean;
            convertActionItemsToTasks?: boolean;
            projectId?: string;
        }
    ): Promise<MinutesOfMeeting> {
        const meeting = await this.meetingRepo.findOne({
            where: { id: meetingId },
            relations: ["mom"],
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);
        if (meeting.mom) {
            throw new ApiError("MOM already exists for this meeting. Use update instead.", 409);
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
            const items = data.actionItems.map((item) =>
                this.actionItemRepo.create({
                    momId: savedMom.id,
                    description: item.description,
                    assigneeId: item.assigneeId,
                    dueDate: item.dueDate,
                    status: MomActionItemStatus.OPEN,
                })
            );
            await this.actionItemRepo.save(items);

            if (data.convertActionItemsToTasks && data.projectId) {
                const created = await this.actionItemRepo.find({ where: { momId: savedMom.id } });
                for (const item of created) {
                    try {
                        await this.convertActionItemToTask(item.id, data.projectId, generatedById);
                    } catch {
                        // skip
                    }
                }
            }
        }

        const shouldPost = data.postToChannel !== false && meeting.channelId;
        if (shouldPost && meeting.channelId) {
            try {
                const actionLines =
                    data.actionItems?.map((a, i) => `${i + 1}. ${a.description}`).join("\n") ||
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
                await channelService.sendMessage(generatedById, meeting.channelId, body);
            } catch (err) {
                console.warn("MOM channel post skipped:", (err as Error).message);
            }
        }

        return this.getMom(meetingId) as Promise<MinutesOfMeeting>;
    }

    async getMom(meetingId: string): Promise<MinutesOfMeeting | null> {
        return this.momRepo.findOne({
            where: { meetingId },
            relations: ["actionItems", "actionItems.assignee", "generatedBy"],
        });
    }

    async updateMom(
        momId: string,
        data: Partial<{ summary: string; decisions: string }>
    ): Promise<MinutesOfMeeting> {
        const mom = await this.momRepo.findOne({ where: { id: momId } });
        if (!mom) throw new ApiError("MOM not found", 404);
        Object.assign(mom, data);
        return this.momRepo.save(mom);
    }

    async addActionItem(
        momId: string,
        data: { description: string; assigneeId?: string; dueDate?: string }
    ): Promise<MomActionItem> {
        const mom = await this.momRepo.findOne({ where: { id: momId } });
        if (!mom) throw new ApiError("MOM not found", 404);
        const item = this.actionItemRepo.create({
            momId,
            description: data.description,
            assigneeId: data.assigneeId,
            dueDate: data.dueDate,
            status: MomActionItemStatus.OPEN,
        });
        return this.actionItemRepo.save(item);
    }

    async updateActionItem(
        actionItemId: string,
        data: Partial<{
            description: string;
            assigneeId: string;
            dueDate: string;
            status: MomActionItemStatus;
        }>
    ): Promise<MomActionItem> {
        const item = await this.actionItemRepo.findOne({ where: { id: actionItemId } });
        if (!item) throw new ApiError("Action item not found", 404);
        Object.assign(item, data);
        return this.actionItemRepo.save(item);
    }

    async convertActionItemToTask(
        actionItemId: string,
        projectId: string,
        createdById: string
    ): Promise<{ actionItem: MomActionItem; task: Task }> {
        const item = await this.actionItemRepo.findOne({
            where: { id: actionItemId },
            relations: ["mom", "mom.meeting"],
        });
        if (!item) throw new ApiError("Action item not found", 404);
        if (item.convertedTaskId) {
            throw new ApiError("Action item has already been converted to a task", 409);
        }

        const task = this.taskRepo.create({
            name: item.description.slice(0, 255),
            description: `[From MOM] ${item.description}`,
            status: TaskStatus.TODO,
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

export const meetingService = new MeetingService();
