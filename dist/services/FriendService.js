"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendService = exports.FriendService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const Friendship_1 = require("../entities/Friendship");
const DirectMessage_1 = require("../entities/DirectMessage");
const User_1 = require("../entities/User");
const errorHandler_1 = require("../middlewares/errorHandler");
class FriendService {
    constructor() {
        this.friendshipRepo = data_source_1.AppDataSource.getRepository(Friendship_1.Friendship);
        this.messageRepo = data_source_1.AppDataSource.getRepository(DirectMessage_1.DirectMessage);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    async searchUsers(query, excludeUserId) {
        const trimmed = query.trim();
        if (!trimmed)
            return [];
        return this.userRepo.find({
            where: [
                { username: (0, typeorm_1.ILike)(`%${trimmed}%`), id: (0, typeorm_1.Not)(excludeUserId) },
                { fullName: (0, typeorm_1.ILike)(`%${trimmed}%`), id: (0, typeorm_1.Not)(excludeUserId) },
                { email: (0, typeorm_1.ILike)(`%${trimmed}%`), id: (0, typeorm_1.Not)(excludeUserId) },
            ],
            take: 20,
        });
    }
    async sendFriendRequest(requesterId, addresseeId) {
        if (requesterId === addresseeId) {
            throw new errorHandler_1.ApiError("Cannot send friend request to yourself", 400);
        }
        const addressee = await this.userRepo.findOne({ where: { id: addresseeId } });
        if (!addressee) {
            throw new errorHandler_1.ApiError("User not found", 404);
        }
        const existing = await this.friendshipRepo.findOne({
            where: [
                { requesterId, addresseeId },
                { requesterId: addresseeId, addresseeId: requesterId },
            ],
        });
        if (existing) {
            if (existing.status === Friendship_1.FriendshipStatus.ACCEPTED) {
                throw new errorHandler_1.ApiError("Already friends", 400);
            }
            if (existing.status === Friendship_1.FriendshipStatus.PENDING) {
                throw new errorHandler_1.ApiError("Friend request already pending", 400);
            }
        }
        const friendship = this.friendshipRepo.create({
            requesterId,
            addresseeId,
            status: Friendship_1.FriendshipStatus.PENDING,
        });
        return this.friendshipRepo.save(friendship);
    }
    async respondToRequest(userId, friendshipId, accept) {
        const friendship = await this.friendshipRepo.findOne({ where: { id: friendshipId } });
        if (!friendship || friendship.addresseeId !== userId) {
            throw new errorHandler_1.ApiError("Friend request not found", 404);
        }
        friendship.status = accept ? Friendship_1.FriendshipStatus.ACCEPTED : Friendship_1.FriendshipStatus.BLOCKED;
        return this.friendshipRepo.save(friendship);
    }
    async getFriends(userId) {
        const friendships = await this.friendshipRepo.find({
            where: [
                { requesterId: userId, status: Friendship_1.FriendshipStatus.ACCEPTED },
                { addresseeId: userId, status: Friendship_1.FriendshipStatus.ACCEPTED },
            ],
            relations: ["requester", "addressee"],
        });
        return friendships.map((f) => f.requesterId === userId ? f.addressee : f.requester);
    }
    async getPendingRequests(userId) {
        return this.friendshipRepo.find({
            where: { addresseeId: userId, status: Friendship_1.FriendshipStatus.PENDING },
            relations: ["requester"],
        });
    }
    async ensureFriendship(userId, otherUserId) {
        const friendship = await this.friendshipRepo.findOne({
            where: [
                { requesterId: userId, addresseeId: otherUserId, status: Friendship_1.FriendshipStatus.ACCEPTED },
                { requesterId: otherUserId, addresseeId: userId, status: Friendship_1.FriendshipStatus.ACCEPTED },
            ],
        });
        if (!friendship) {
            throw new errorHandler_1.ApiError("You can only message friends", 403);
        }
    }
    async getConversation(userId, otherUserId) {
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
    async sendDirectMessage(senderId, recipientId, body) {
        await this.ensureFriendship(senderId, recipientId);
        const message = this.messageRepo.create({
            senderId,
            recipientId,
            body: body.trim(),
        });
        return this.messageRepo.save(message);
    }
    async setDmMute(userId, otherUserId, isMuted) {
        const messages = await this.messageRepo.find({
            where: [
                { senderId: userId, recipientId: otherUserId },
                { senderId: otherUserId, recipientId: userId },
            ],
        });
        for (const message of messages) {
            if (message.senderId === userId) {
                message.senderMuted = isMuted;
            }
            else {
                message.recipientMuted = isMuted;
            }
        }
        if (messages.length > 0) {
            await this.messageRepo.save(messages);
        }
    }
}
exports.FriendService = FriendService;
exports.friendService = new FriendService();
