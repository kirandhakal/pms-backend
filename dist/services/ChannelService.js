"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelService = exports.ChannelService = void 0;
const data_source_1 = require("../config/data-source");
const Channel_1 = require("../entities/Channel");
const ChannelMember_1 = require("../entities/ChannelMember");
const ChannelMessage_1 = require("../entities/ChannelMessage");
const User_1 = require("../entities/User");
const errorHandler_1 = require("../middlewares/errorHandler");
class ChannelService {
    constructor() {
        this.channelRepo = data_source_1.AppDataSource.getRepository(Channel_1.Channel);
        this.memberRepo = data_source_1.AppDataSource.getRepository(ChannelMember_1.ChannelMember);
        this.messageRepo = data_source_1.AppDataSource.getRepository(ChannelMessage_1.ChannelMessage);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    async ensureTeamMember(userId, teamId) {
        const user = await this.userRepo.findOne({ where: { id: userId }, relations: ["team"] });
        if (!user || user.team?.id !== teamId) {
            throw new errorHandler_1.ApiError("You do not belong to this organization", 403);
        }
        return user;
    }
    async canAccessChannel(userId, channel) {
        if (channel.type === Channel_1.ChannelType.PUBLIC) {
            return true;
        }
        const membership = await this.memberRepo.findOne({
            where: { channelId: channel.id, userId },
        });
        return Boolean(membership);
    }
    async listChannels(userId, teamId) {
        await this.ensureTeamMember(userId, teamId);
        const channels = await this.channelRepo.find({
            where: { teamId, isActive: true },
            relations: ["members"],
            order: { createdAt: "ASC" },
        });
        const accessible = [];
        for (const channel of channels) {
            if (await this.canAccessChannel(userId, channel)) {
                accessible.push(channel);
            }
        }
        return accessible;
    }
    async createChannel(data) {
        await this.ensureTeamMember(data.createdById, data.teamId);
        const channel = this.channelRepo.create({
            name: data.name.trim(),
            description: data.description,
            type: data.type,
            teamId: data.teamId,
            createdById: data.createdById,
            isActive: true,
        });
        const saved = await this.channelRepo.save(channel);
        if (data.type === Channel_1.ChannelType.PRIVATE && data.memberIds?.length) {
            const members = data.memberIds.map((memberId) => this.memberRepo.create({ channelId: saved.id, userId: memberId }));
            await this.memberRepo.save(members);
        }
        if (data.type === Channel_1.ChannelType.PRIVATE) {
            const creatorMembership = this.memberRepo.create({
                channelId: saved.id,
                userId: data.createdById,
            });
            await this.memberRepo.save(creatorMembership);
        }
        return saved;
    }
    async joinPublicChannel(userId, channelId) {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel || !channel.isActive) {
            throw new errorHandler_1.ApiError("Channel not found", 404);
        }
        if (channel.type !== Channel_1.ChannelType.PUBLIC) {
            throw new errorHandler_1.ApiError("Only public channels can be joined freely", 400);
        }
        await this.ensureTeamMember(userId, channel.teamId);
        let membership = await this.memberRepo.findOne({ where: { channelId, userId } });
        if (!membership) {
            membership = this.memberRepo.create({ channelId, userId });
            await this.memberRepo.save(membership);
        }
        return membership;
    }
    async getMessages(userId, channelId) {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel || !channel.isActive) {
            throw new errorHandler_1.ApiError("Channel not found", 404);
        }
        if (!(await this.canAccessChannel(userId, channel))) {
            throw new errorHandler_1.ApiError("You do not have access to this channel", 403);
        }
        return this.messageRepo.find({
            where: { channelId, isDeleted: false },
            relations: ["user"],
            order: { createdAt: "ASC" },
        });
    }
    async sendMessage(userId, channelId, body) {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel || !channel.isActive) {
            throw new errorHandler_1.ApiError("Channel not found", 404);
        }
        if (!(await this.canAccessChannel(userId, channel))) {
            throw new errorHandler_1.ApiError("You do not have access to this channel", 403);
        }
        const membership = await this.memberRepo.findOne({ where: { channelId, userId } });
        if (membership?.isMuted) {
            throw new errorHandler_1.ApiError("Channel is muted", 400);
        }
        const message = this.messageRepo.create({ channelId, userId, body: body.trim() });
        return this.messageRepo.save(message);
    }
    async deleteMessage(userId, messageId) {
        const message = await this.messageRepo.findOne({ where: { id: messageId } });
        if (!message) {
            throw new errorHandler_1.ApiError("Message not found", 404);
        }
        if (message.userId !== userId) {
            throw new errorHandler_1.ApiError("You can only delete your own messages", 403);
        }
        message.isDeleted = true;
        await this.messageRepo.save(message);
    }
    async setMute(userId, channelId, isMuted) {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel) {
            throw new errorHandler_1.ApiError("Channel not found", 404);
        }
        await this.ensureTeamMember(userId, channel.teamId);
        let membership = await this.memberRepo.findOne({ where: { channelId, userId } });
        if (!membership) {
            membership = this.memberRepo.create({ channelId, userId, isMuted });
        }
        else {
            membership.isMuted = isMuted;
        }
        return this.memberRepo.save(membership);
    }
}
exports.ChannelService = ChannelService;
exports.channelService = new ChannelService();
