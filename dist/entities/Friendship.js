"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Friendship = exports.FriendshipStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var FriendshipStatus;
(function (FriendshipStatus) {
    FriendshipStatus["PENDING"] = "pending";
    FriendshipStatus["ACCEPTED"] = "accepted";
    FriendshipStatus["BLOCKED"] = "blocked";
})(FriendshipStatus || (exports.FriendshipStatus = FriendshipStatus = {}));
let Friendship = class Friendship {
};
exports.Friendship = Friendship;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Friendship.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "requesterId" }),
    __metadata("design:type", User_1.User)
], Friendship.prototype, "requester", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Friendship.prototype, "requesterId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "addresseeId" }),
    __metadata("design:type", User_1.User)
], Friendship.prototype, "addressee", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Friendship.prototype, "addresseeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: FriendshipStatus, default: FriendshipStatus.PENDING }),
    __metadata("design:type", String)
], Friendship.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Friendship.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Friendship.prototype, "updatedAt", void 0);
exports.Friendship = Friendship = __decorate([
    (0, typeorm_1.Entity)("friendships"),
    (0, typeorm_1.Unique)(["requesterId", "addresseeId"])
], Friendship);
