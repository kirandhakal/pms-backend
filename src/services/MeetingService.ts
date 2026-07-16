import { AppDataSource } from "../config/data-source";
import { Meeting, MeetingStatus } from "../entities/Meeting";
import { MeetingParticipant } from "../entities/MeetingParticipant";
import { MeetingNote } from "../entities/MeetingNote";
import { MinutesOfMeeting } from "../entities/MinutesOfMeeting";
import { MomActionItem, MomActionItemStatus } from "../entities/MomActionItem";
import { Task, TaskStatus } from "../entities/Task";
import { ApiError } from "../middlewares/errorHandler";

export class MeetingService {
    private meetingRepo = AppDataSource.getRepository(Meeting);
    private participantRepo = AppDataSource.getRepository(MeetingParticipant);
    private noteRepo = AppDataSource.getRepository(MeetingNote);
    private momRepo = AppDataSource.getRepository(MinutesOfMeeting);
    private actionItemRepo = AppDataSource.getRepository(MomActionItem);
    private taskRepo = AppDataSource.getRepository(Task);

    // ─────────────────────────────────────
    // MEETINGS
    // ─────────────────────────────────────

    async createMeeting(data: {
        organizationId: string;
        projectId?: string;
        channelId?: string;
        title: string;
        agenda?: string;
        scheduledAt: Date;
        durationMins?: number;
        createdById: string;
        participantIds?: string[];
    }): Promise<Meeting> {
        const meeting = this.meetingRepo.create({
            organizationId: data.organizationId,
            projectId: data.projectId,
            channelId: data.channelId,
            title: data.title,
            agenda: data.agenda,
            scheduledAt: data.scheduledAt,
            durationMins: data.durationMins ?? 30,
            createdById: data.createdById,
            status: MeetingStatus.SCHEDULED,
        });

        const saved = await this.meetingRepo.save(meeting);

        // Add creator as organizer
        const organizer = this.participantRepo.create({
            meetingId: saved.id,
            userId: data.createdById,
            isOrganizer: true,
        });
        await this.participantRepo.save(organizer);

        // Add participants
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
            if (participants.length) {
                await this.participantRepo.save(participants);
            }
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

    async getMeetingsByOrganization(organizationId: string, projectId?: string): Promise<Meeting[]> {
        const where: any = { organizationId };
        if (projectId) where.projectId = projectId;

        return this.meetingRepo.find({
            where,
            relations: ["participants", "participants.user", "createdBy", "project"],
            order: { scheduledAt: "DESC" },
        });
    }

    async updateMeeting(
        id: string,
        data: Partial<{
            title: string;
            agenda: string;
            scheduledAt: Date;
            durationMins: number;
            channelId: string;
            projectId: string;
        }>
    ): Promise<Meeting> {
        const meeting = await this.meetingRepo.findOne({ where: { id } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        Object.assign(meeting, data);
        await this.meetingRepo.save(meeting);
        return this.getMeetingById(id) as Promise<Meeting>;
    }

    async updateMeetingStatus(id: string, status: MeetingStatus): Promise<Meeting> {
        const meeting = await this.meetingRepo.findOne({ where: { id } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        // Validate status transitions
        const validTransitions: Record<MeetingStatus, MeetingStatus[]> = {
            [MeetingStatus.SCHEDULED]: [MeetingStatus.IN_PROGRESS, MeetingStatus.CANCELLED],
            [MeetingStatus.IN_PROGRESS]: [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED],
            [MeetingStatus.COMPLETED]: [],
            [MeetingStatus.CANCELLED]: [],
        };

        if (!validTransitions[meeting.status].includes(status)) {
            throw new ApiError(
                `Cannot transition from ${meeting.status} to ${status}`,
                400
            );
        }

        meeting.status = status;
        await this.meetingRepo.save(meeting);
        return this.getMeetingById(id) as Promise<Meeting>;
    }

    // ─────────────────────────────────────
    // PARTICIPANTS
    // ─────────────────────────────────────

    async addParticipants(meetingId: string, userIds: string[]): Promise<MeetingParticipant[]> {
        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const existing = await this.participantRepo.find({
            where: { meetingId },
        });
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

    // ─────────────────────────────────────
    // NOTES
    // ─────────────────────────────────────

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

    // ─────────────────────────────────────
    // MOM (Minutes of Meeting)
    // ─────────────────────────────────────

    /**
     * Generate MOM from meeting notes (template-based v1)
     */
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
        }
    ): Promise<MinutesOfMeeting> {
        const meeting = await this.meetingRepo.findOne({
            where: { id: meetingId },
            relations: ["mom"],
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);
        if (meeting.mom) throw new ApiError("MOM already exists for this meeting. Use update instead.", 409);

        const mom = this.momRepo.create({
            meetingId,
            summary: data.summary,
            decisions: data.decisions,
            generatedById,
            isAutoDrafted: false,
        });

        const savedMom = await this.momRepo.save(mom);

        // Create action items
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

    // ─────────────────────────────────────
    // ACTION ITEMS
    // ─────────────────────────────────────

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

    /**
     * Convert an action item into a Kanban Task
     */
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

        // Create task
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

        // Link back
        item.convertedTaskId = savedTask.id;
        const updatedItem = await this.actionItemRepo.save(item);

        return { actionItem: updatedItem, task: savedTask };
    }
}

export const meetingService = new MeetingService();
