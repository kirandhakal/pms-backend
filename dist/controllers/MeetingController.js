"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingController = void 0;
const MeetingService_1 = require("../services/MeetingService");
class MeetingController {
    async create(req, res) {
        try {
            const isPersonal = !!req.body.isPersonal || !req.body.organizationId;
            const meeting = await MeetingService_1.meetingService.createMeeting({
                ...req.body,
                isPersonal,
                createdById: req.user.id,
            });
            const inviteUrl = MeetingService_1.meetingService.getInviteLink(meeting);
            res.status(201).json({
                message: "Meeting created",
                data: meeting,
                inviteUrl,
            });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async list(req, res) {
        try {
            const organizationId = req.query.organizationId
                ? String(req.query.organizationId)
                : undefined;
            const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
            const topic = req.query.topic ? String(req.query.topic) : undefined;
            const status = req.query.status ? String(req.query.status) : undefined;
            const personalOnly = req.query.personal === "true" ||
                req.query.personalOnly === "true" ||
                (!organizationId && !!req.user?.id);
            const meetings = await MeetingService_1.meetingService.listMeetings({
                organizationId,
                projectId,
                topic,
                status: status,
                userId: req.user.id,
                personalOnly: personalOnly && !organizationId,
            });
            res.json({ data: meetings });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async getById(req, res) {
        try {
            const meeting = await MeetingService_1.meetingService.getMeetingById(String(req.params.id));
            if (!meeting) {
                return res.status(404).json({ message: "Meeting not found" });
            }
            res.json({
                data: meeting,
                inviteUrl: MeetingService_1.meetingService.getInviteLink(meeting),
            });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async update(req, res) {
        try {
            const meeting = await MeetingService_1.meetingService.updateMeeting(String(req.params.id), req.body);
            res.json({
                message: "Meeting updated",
                data: meeting,
                inviteUrl: MeetingService_1.meetingService.getInviteLink(meeting),
            });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async updateStatus(req, res) {
        try {
            const { status } = req.body;
            const meeting = await MeetingService_1.meetingService.updateMeetingStatus(String(req.params.id), status);
            res.json({ message: "Meeting status updated", data: meeting });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async addParticipants(req, res) {
        try {
            const { userIds } = req.body;
            const participants = await MeetingService_1.meetingService.addParticipants(String(req.params.id), userIds);
            res.status(201).json({ data: participants });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async removeParticipant(req, res) {
        try {
            await MeetingService_1.meetingService.removeParticipant(String(req.params.id), String(req.params.userId));
            res.json({ message: "Participant removed" });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async markAttendance(req, res) {
        try {
            const { userId, attended } = req.body;
            const participant = await MeetingService_1.meetingService.markAttendance(String(req.params.id), userId, attended);
            res.json({ data: participant });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async addNote(req, res) {
        try {
            const note = await MeetingService_1.meetingService.addNote(String(req.params.id), req.user.id, req.body.content);
            res.status(201).json({ data: note });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getNotes(req, res) {
        try {
            const notes = await MeetingService_1.meetingService.getNotes(String(req.params.id));
            res.json({ data: notes });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async generateMom(req, res) {
        try {
            const mom = await MeetingService_1.meetingService.generateMom(String(req.params.id), req.user.id, req.body);
            res.status(201).json({ message: "MOM generated", data: mom });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getMom(req, res) {
        try {
            const mom = await MeetingService_1.meetingService.getMom(String(req.params.id));
            if (!mom) {
                return res.status(404).json({ message: "MOM not found for this meeting" });
            }
            res.json({ data: mom });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async updateMom(req, res) {
        try {
            const mom = await MeetingService_1.meetingService.updateMom(String(req.params.momId), req.body);
            res.json({ message: "MOM updated", data: mom });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async addActionItem(req, res) {
        try {
            const item = await MeetingService_1.meetingService.addActionItem(String(req.params.momId), req.body);
            res.status(201).json({ data: item });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async updateActionItem(req, res) {
        try {
            const item = await MeetingService_1.meetingService.updateActionItem(String(req.params.actionItemId), req.body);
            res.json({ data: item });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async convertToTask(req, res) {
        try {
            const { projectId } = req.body;
            const result = await MeetingService_1.meetingService.convertActionItemToTask(String(req.params.actionItemId), projectId, req.user.id);
            res.status(201).json({
                message: "Action item converted to task",
                data: result,
            });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getInvitePreview(req, res) {
        try {
            const slug = String(req.params.token || req.params.slug || req.query.token || "");
            const preview = await MeetingService_1.meetingService.getPublicPreview(slug);
            res.json({ data: { ...preview, canJoinPublicly: true } });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async joinViaInvite(req, res) {
        try {
            const slug = String(req.body.token || req.body.slug || req.params.slug || "");
            if (!req.user?.id) {
                return res.status(401).json({ message: "Sign in required, or use guest join" });
            }
            const meeting = await MeetingService_1.meetingService.joinViaSlug(req.user.id, slug);
            res.json({ message: "Joined meeting", data: meeting });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async regenerateInvite(req, res) {
        try {
            const result = await MeetingService_1.meetingService.regenerateInviteLink(String(req.params.id), {
                makePublic: req.body?.makePublic !== false,
                allowGuestJoin: req.body?.allowGuestJoin,
            });
            res.json(result);
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
exports.MeetingController = MeetingController;
