import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { meetingService } from "../services/MeetingService";
import { MeetingStatus } from "../entities/Meeting";
import { MomActionItemStatus } from "../entities/MomActionItem";

export class MeetingController {
    // ─── MEETINGS ───────────────────────────────────

    async create(req: AuthRequest, res: Response) {
        try {
            const meeting = await meetingService.createMeeting({
                ...req.body,
                createdById: req.user!.id,
            });
            res.status(201).json({ message: "Meeting created", data: meeting });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async list(req: AuthRequest, res: Response) {
        try {
            const organizationId = String(req.query.organizationId || "");
            const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
            const meetings = await meetingService.getMeetingsByOrganization(
                organizationId,
                projectId
            );
            res.json({ data: meetings });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async getById(req: AuthRequest, res: Response) {
        try {
            const meeting = await meetingService.getMeetingById(String(req.params.id));
            if (!meeting) {
                return res.status(404).json({ message: "Meeting not found" });
            }
            res.json({ data: meeting });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async update(req: AuthRequest, res: Response) {
        try {
            const meeting = await meetingService.updateMeeting(String(req.params.id), req.body);
            res.json({ message: "Meeting updated", data: meeting });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async updateStatus(req: AuthRequest, res: Response) {
        try {
            const { status } = req.body;
            const meeting = await meetingService.updateMeetingStatus(
                String(req.params.id),
                status as MeetingStatus
            );
            res.json({ message: "Meeting status updated", data: meeting });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    // ─── PARTICIPANTS ───────────────────────────────

    async addParticipants(req: AuthRequest, res: Response) {
        try {
            const { userIds } = req.body;
            const participants = await meetingService.addParticipants(
                String(req.params.id),
                userIds
            );
            res.status(201).json({ data: participants });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async removeParticipant(req: AuthRequest, res: Response) {
        try {
            await meetingService.removeParticipant(String(req.params.id), String(req.params.userId));
            res.json({ message: "Participant removed" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async markAttendance(req: AuthRequest, res: Response) {
        try {
            const { userId, attended } = req.body;
            const participant = await meetingService.markAttendance(
                String(req.params.id),
                userId,
                attended
            );
            res.json({ data: participant });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    // ─── NOTES ──────────────────────────────────────

    async addNote(req: AuthRequest, res: Response) {
        try {
            const note = await meetingService.addNote(
                String(req.params.id),
                req.user!.id,
                req.body.content
            );
            res.status(201).json({ data: note });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async getNotes(req: AuthRequest, res: Response) {
        try {
            const notes = await meetingService.getNotes(String(req.params.id));
            res.json({ data: notes });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    // ─── MOM ────────────────────────────────────────

    async generateMom(req: AuthRequest, res: Response) {
        try {
            const mom = await meetingService.generateMom(
                String(req.params.id),
                req.user!.id,
                req.body
            );
            res.status(201).json({ message: "MOM generated", data: mom });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async getMom(req: AuthRequest, res: Response) {
        try {
            const mom = await meetingService.getMom(String(req.params.id));
            if (!mom) {
                return res.status(404).json({ message: "MOM not found for this meeting" });
            }
            res.json({ data: mom });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async updateMom(req: AuthRequest, res: Response) {
        try {
            const mom = await meetingService.updateMom(String(req.params.momId), req.body);
            res.json({ message: "MOM updated", data: mom });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    // ─── ACTION ITEMS ───────────────────────────────

    async addActionItem(req: AuthRequest, res: Response) {
        try {
            const item = await meetingService.addActionItem(String(req.params.momId), req.body);
            res.status(201).json({ data: item });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async updateActionItem(req: AuthRequest, res: Response) {
        try {
            const item = await meetingService.updateActionItem(
                String(req.params.actionItemId),
                req.body
            );
            res.json({ data: item });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async convertToTask(req: AuthRequest, res: Response) {
        try {
            const { projectId } = req.body;
            const result = await meetingService.convertActionItemToTask(
                String(req.params.actionItemId),
                projectId,
                req.user!.id
            );
            res.status(201).json({
                message: "Action item converted to task",
                data: result,
            });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
