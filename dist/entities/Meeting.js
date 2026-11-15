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
exports.Meeting = exports.MeetingVisibility = exports.MeetingStatus = void 0;
const typeorm_1 = require("typeorm");
const Organization_1 = require("./Organization");
const Project_1 = require("./Project");
const Channel_1 = require("./Channel");
const User_1 = require("./User");
const MeetingParticipant_1 = require("./MeetingParticipant");
const MeetingNote_1 = require("./MeetingNote");
const MinutesOfMeeting_1 = require("./MinutesOfMeeting");
var MeetingStatus;
(function (MeetingStatus) {
    MeetingStatus["SCHEDULED"] = "SCHEDULED";
    MeetingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MeetingStatus["COMPLETED"] = "COMPLETED";
    MeetingStatus["CANCELLED"] = "CANCELLED";
})(MeetingStatus || (exports.MeetingStatus = MeetingStatus = {}));
var MeetingVisibility;
(function (MeetingVisibility) {
    MeetingVisibility["PRIVATE"] = "PRIVATE";
    MeetingVisibility["PUBLIC"] = "PUBLIC";
})(MeetingVisibility || (exports.MeetingVisibility = MeetingVisibility = {}));
let Meeting = class Meeting {
};
exports.Meeting = Meeting;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Meeting.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organization_1.Organization, { onDelete: "CASCADE", nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "organizationId" }),
    __metadata("design:type", Organization_1.Organization)
], Meeting.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Meeting.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "projectId" }),
    __metadata("design:type", Project_1.Project)
], Meeting.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Meeting.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Channel_1.Channel, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "channelId" }),
    __metadata("design:type", Channel_1.Channel)
], Meeting.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "channelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Meeting.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Meeting.prototype, "topic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "agenda", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], Meeting.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 30 }),
    __metadata("design:type", Number)
], Meeting.prototype, "durationMins", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: MeetingStatus, default: MeetingStatus.SCHEDULED }),
    __metadata("design:type", String)
], Meeting.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: MeetingVisibility, default: MeetingVisibility.PRIVATE }),
    __metadata("design:type", String)
], Meeting.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "inviteToken", unique: true, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Meeting.prototype, "inviteSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Meeting.prototype, "allowGuestJoin", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "createdById" }),
    __metadata("design:type", User_1.User)
], Meeting.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Meeting.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => MeetingParticipant_1.MeetingParticipant, (p) => p.meeting, { cascade: true }),
    __metadata("design:type", Array)
], Meeting.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => MeetingNote_1.MeetingNote, (n) => n.meeting, { cascade: true }),
    __metadata("design:type", Array)
], Meeting.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => MinutesOfMeeting_1.MinutesOfMeeting, (m) => m.meeting),
    __metadata("design:type", MinutesOfMeeting_1.MinutesOfMeeting)
], Meeting.prototype, "mom", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Meeting.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Meeting.prototype, "updatedAt", void 0);
exports.Meeting = Meeting = __decorate([
    (0, typeorm_1.Entity)("meetings")
], Meeting);
