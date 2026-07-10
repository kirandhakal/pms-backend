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
exports.Channel = exports.ChannelType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Team_1 = require("./Team");
const ChannelMessage_1 = require("./ChannelMessage");
const ChannelMember_1 = require("./ChannelMember");
var ChannelType;
(function (ChannelType) {
    ChannelType["PUBLIC"] = "public";
    ChannelType["PRIVATE"] = "private";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
let Channel = class Channel {
};
exports.Channel = Channel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Channel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Channel.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Channel.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ChannelType, default: ChannelType.PUBLIC }),
    __metadata("design:type", String)
], Channel.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "teamId" }),
    __metadata("design:type", Team_1.Team)
], Channel.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Channel.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "createdById" }),
    __metadata("design:type", User_1.User)
], Channel.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Channel.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChannelMessage_1.ChannelMessage, (message) => message.channel),
    __metadata("design:type", Array)
], Channel.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChannelMember_1.ChannelMember, (member) => member.channel),
    __metadata("design:type", Array)
], Channel.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Channel.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Channel.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Channel.prototype, "updatedAt", void 0);
exports.Channel = Channel = __decorate([
    (0, typeorm_1.Entity)("channels")
], Channel);
