import { AppDataSource } from "../config/data-source";
import { Channel, ChannelType } from "../entities/Channel";
import { ChannelMember } from "../entities/ChannelMember";
import { ChannelMessage } from "../entities/ChannelMessage";
import { User } from "../entities/User";
import { ApiError } from "../middlewares/errorHandler";

export class ChannelService {
    private channelRepo = AppDataSource.getRepository(Channel);
    private memberRepo = AppDataSource.getRepository(ChannelMember);
    private messageRepo = AppDataSource.getRepository(ChannelMessage);
    private userRepo = AppDataSource.getRepository(User);

    private async ensureTeamMember(userId: string, teamId: string): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id: userId }, relations: ["team"] });
        if (!user || user.team?.id !== teamId) {
            throw new ApiError("You do not belong to this organization", 403);
        }
        return user;
    }

    private async canAccessChannel(userId: string, channel: Channel): Promise<boolean> {
        if (channel.type === ChannelType.PUBLIC) {
            return true;
        }
        const membership = await this.memberRepo.findOne({
            where: { channelId: channel.id, userId },
        });
        return Boolean(membership);
    }

    async listChannels(userId: string, teamId: string): Promise<Channel[]> {
        await this.ensureTeamMember(userId, teamId);

        const channels = await this.channelRepo.find({
            where: { teamId, isActive: true },
            relations: ["members"],
            order: { createdAt: "ASC" },
        });

        const accessible: Channel[] = [];
        for (const channel of channels) {
            if (await this.canAccessChannel(userId, channel)) {
                accessible.push(channel);
            }
        }
        return accessible;
    }

    async createChannel(data: {
        name: string;
        description?: string;
        type: ChannelType;
        teamId: string;
        createdById: string;
        memberIds?: string[];
    }): Promise<Channel> {
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

        if (data.type === ChannelType.PRIVATE && data.memberIds?.length) {
            const members = data.memberIds.map((memberId) =>
                this.memberRepo.create({ channelId: saved.id, userId: memberId })
            );
            await this.memberRepo.save(members);
        }

        if (data.type === ChannelType.PRIVATE) {
            const creatorMembership = this.memberRepo.create({
                channelId: saved.id,
                userId: data.createdById,
            });
            await this.memberRepo.save(creatorMembership);
        }

        return saved;
    }

    async joinPublicChannel(userId: string, channelId: string): Promise<ChannelMember> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel || !channel.isActive) {
            throw new ApiError("Channel not found", 404);
        }
        if (channel.type !== ChannelType.PUBLIC) {
            throw new ApiError("Only public channels can be joined freely", 400);
        }

        await this.ensureTeamMember(userId, channel.teamId);

        let membership = await this.memberRepo.findOne({ where: { channelId, userId } });
        if (!membership) {
            membership = this.memberRepo.create({ channelId, userId });
            await this.memberRepo.save(membership);
        }
        return membership;
    }

    async getMessages(userId: string, channelId: string): Promise<ChannelMessage[]> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel || !channel.isActive) {
            throw new ApiError("Channel not found", 404);
        }
        if (!(await this.canAccessChannel(userId, channel))) {
            throw new ApiError("You do not have access to this channel", 403);
        }

        return this.messageRepo.find({
            where: { channelId, isDeleted: false },
            relations: ["user"],
            order: { createdAt: "ASC" },
        });
    }

    async sendMessage(userId: string, channelId: string, body: string): Promise<ChannelMessage> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel || !channel.isActive) {
            throw new ApiError("Channel not found", 404);
        }
        if (!(await this.canAccessChannel(userId, channel))) {
            throw new ApiError("You do not have access to this channel", 403);
        }

        const membership = await this.memberRepo.findOne({ where: { channelId, userId } });
        if (membership?.isMuted) {
            throw new ApiError("Channel is muted", 400);
        }

        const message = this.messageRepo.create({ channelId, userId, body: body.trim() });
        return this.messageRepo.save(message);
    }

    async deleteMessage(userId: string, messageId: string): Promise<void> {
        const message = await this.messageRepo.findOne({ where: { id: messageId } });
        if (!message) {
            throw new ApiError("Message not found", 404);
        }
        if (message.userId !== userId) {
            throw new ApiError("You can only delete your own messages", 403);
        }
        message.isDeleted = true;
        await this.messageRepo.save(message);
    }

    async setMute(userId: string, channelId: string, isMuted: boolean): Promise<ChannelMember> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel) {
            throw new ApiError("Channel not found", 404);
        }
        await this.ensureTeamMember(userId, channel.teamId);

        let membership = await this.memberRepo.findOne({ where: { channelId, userId } });
        if (!membership) {
            membership = this.memberRepo.create({ channelId, userId, isMuted });
        } else {
            membership.isMuted = isMuted;
        }
        return this.memberRepo.save(membership);
    }
}

export const channelService = new ChannelService();
