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
exports.MinutesOfMeeting = void 0;
const typeorm_1 = require("typeorm");
const Meeting_1 = require("./Meeting");
const User_1 = require("./User");
const MomActionItem_1 = require("./MomActionItem");
let MinutesOfMeeting = class MinutesOfMeeting {
};
exports.MinutesOfMeeting = MinutesOfMeeting;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], MinutesOfMeeting.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Meeting_1.Meeting, (meeting) => meeting.mom, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "meetingId" }),
    __metadata("design:type", Meeting_1.Meeting)
], MinutesOfMeeting.prototype, "meeting", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], MinutesOfMeeting.prototype, "meetingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], MinutesOfMeeting.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], MinutesOfMeeting.prototype, "decisions", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "generatedById" }),
    __metadata("design:type", User_1.User)
], MinutesOfMeeting.prototype, "generatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MinutesOfMeeting.prototype, "generatedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MinutesOfMeeting.prototype, "isAutoDrafted", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => MomActionItem_1.MomActionItem, (a) => a.mom, { cascade: true }),
    __metadata("design:type", Array)
], MinutesOfMeeting.prototype, "actionItems", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MinutesOfMeeting.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MinutesOfMeeting.prototype, "updatedAt", void 0);
exports.MinutesOfMeeting = MinutesOfMeeting = __decorate([
    (0, typeorm_1.Entity)("minutes_of_meeting")
], MinutesOfMeeting);
