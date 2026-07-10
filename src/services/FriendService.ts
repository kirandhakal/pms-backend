import { ILike, Not } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Friendship, FriendshipStatus } from "../entities/Friendship";
import { DirectMessage } from "../entities/DirectMessage";
import { User } from "../entities/User";
import { ApiError } from "../middlewares/errorHandler";

export class FriendService {
    private friendshipRepo = AppDataSource.getRepository(Friendship);
    private messageRepo = AppDataSource.getRepository(DirectMessage);
    private userRepo = AppDataSource.getRepository(User);

    async searchUsers(query: string, excludeUserId: string): Promise<User[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        return this.userRepo.find({
            where: [
                { username: ILike(`%${trimmed}%`), id: Not(excludeUserId) },
                { fullName: ILike(`%${trimmed}%`), id: Not(excludeUserId) },
                { email: ILike(`%${trimmed}%`), id: Not(excludeUserId) },
            ],
            take: 20,
        });
    }

    async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
        if (requesterId === addresseeId) {
            throw new ApiError("Cannot send friend request to yourself", 400);
        }

        const addressee = await this.userRepo.findOne({ where: { id: addresseeId } });
        if (!addressee) {
            throw new ApiError("User not found", 404);
        }

        const existing = await this.friendshipRepo.findOne({
            where: [
                { requesterId, addresseeId },
                { requesterId: addresseeId, addresseeId: requesterId },
            ],
        });

        if (existing) {
            if (existing.status === FriendshipStatus.ACCEPTED) {
                throw new ApiError("Already friends", 400);
            }
            if (existing.status === FriendshipStatus.PENDING) {
                throw new ApiError("Friend request already pending", 400);
            }
        }

        const friendship = this.friendshipRepo.create({
            requesterId,
            addresseeId,
            status: FriendshipStatus.PENDING,
        });
        return this.friendshipRepo.save(friendship);
    }

    async respondToRequest(
        userId: string,
        friendshipId: string,
        accept: boolean
    ): Promise<Friendship> {
        const friendship = await this.friendshipRepo.findOne({ where: { id: friendshipId } });
        if (!friendship || friendship.addresseeId !== userId) {
            throw new ApiError("Friend request not found", 404);
        }

        friendship.status = accept ? FriendshipStatus.ACCEPTED : FriendshipStatus.BLOCKED;
        return this.friendshipRepo.save(friendship);
    }

    async getFriends(userId: string): Promise<User[]> {
        const friendships = await this.friendshipRepo.find({
            where: [
                { requesterId: userId, status: FriendshipStatus.ACCEPTED },
                { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
            ],
            relations: ["requester", "addressee"],
        });

        return friendships.map((f) =>
            f.requesterId === userId ? f.addressee : f.requester
        );
    }

    async getPendingRequests(userId: string): Promise<Friendship[]> {
        return this.friendshipRepo.find({
            where: { addresseeId: userId, status: FriendshipStatus.PENDING },
            relations: ["requester"],
        });
    }

    private async ensureFriendship(userId: string, otherUserId: string): Promise<void> {
        const friendship = await this.friendshipRepo.findOne({
            where: [
                { requesterId: userId, addresseeId: otherUserId, status: FriendshipStatus.ACCEPTED },
                { requesterId: otherUserId, addresseeId: userId, status: FriendshipStatus.ACCEPTED },
            ],
        });
        if (!friendship) {
            throw new ApiError("You can only message friends", 403);
        }
    }

    async getConversation(userId: string, otherUserId: string): Promise<DirectMessage[]> {
        await this.ensureFriendship(userId, otherUserId);

        return this.messageRepo.find({
            where: [
                { senderId: userId, recipientId: otherUserId, isDeleted: false },
                { senderId: otherUserId, recipientId: userId, isDeleted: false },
            ],
            relations: ["sender", "recipient"],
            order: { createdAt: "ASC" },
        });
    }

    async sendDirectMessage(
        senderId: string,
        recipientId: string,
        body: string
    ): Promise<DirectMessage> {
        await this.ensureFriendship(senderId, recipientId);

        const message = this.messageRepo.create({
            senderId,
            recipientId,
            body: body.trim(),
        });
        return this.messageRepo.save(message);
    }

    async setDmMute(userId: string, otherUserId: string, isMuted: boolean): Promise<void> {
        const messages = await this.messageRepo.find({
            where: [
                { senderId: userId, recipientId: otherUserId },
                { senderId: otherUserId, recipientId: userId },
            ],
        });

        for (const message of messages) {
            if (message.senderId === userId) {
                message.senderMuted = isMuted;
            } else {
                message.recipientMuted = isMuted;
            }
        }

        if (messages.length > 0) {
            await this.messageRepo.save(messages);
        }
    }
}

export const friendService = new FriendService();
