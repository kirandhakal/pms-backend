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
exports.ChannelMember = void 0;
const typeorm_1 = require("typeorm");
const Channel_1 = require("./Channel");
const User_1 = require("./User");
let ChannelMember = class ChannelMember {
};
exports.ChannelMember = ChannelMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ChannelMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Channel_1.Channel, (channel) => channel.members, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "channelId" }),
    __metadata("design:type", Channel_1.Channel)
], ChannelMember.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ChannelMember.prototype, "channelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], ChannelMember.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ChannelMember.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMember.prototype, "isMuted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ChannelMember.prototype, "joinedAt", void 0);
exports.ChannelMember = ChannelMember = __decorate([
    (0, typeorm_1.Entity)("channel_members"),
    (0, typeorm_1.Unique)(["channelId", "userId"])
], ChannelMember);
