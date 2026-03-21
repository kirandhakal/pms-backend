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
exports.ActivityLog = exports.ActivityAction = void 0;
const typeorm_1 = require("typeorm");
const Team_1 = require("./Team");
const User_1 = require("./User");
const Task_1 = require("./Task");
var ActivityAction;
(function (ActivityAction) {
    ActivityAction["ORGANIZATION_CREATED"] = "OrganizationCreated";
    ActivityAction["MEMBER_INVITED"] = "MemberInvited";
    ActivityAction["MEMBER_ADDED"] = "MemberAdded";
    ActivityAction["MEMBER_JOINED"] = "MemberJoined";
    ActivityAction["MEMBER_REMOVED"] = "MemberRemoved";
    ActivityAction["MEMBER_ROLE_UPDATED"] = "MemberRoleUpdated";
    ActivityAction["TASK_CREATED"] = "TaskCreated";
    ActivityAction["TASK_STATUS_UPDATED"] = "TaskStatusUpdated";
})(ActivityAction || (exports.ActivityAction = ActivityAction = {}));
let ActivityLog = class ActivityLog {
};
exports.ActivityLog = ActivityLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ActivityLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, { nullable: true }),
    __metadata("design:type", Team_1.Team)
], ActivityLog.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], ActivityLog.prototype, "actor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], ActivityLog.prototype, "targetUser", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task_1.Task, { nullable: true }),
    __metadata("design:type", Task_1.Task)
], ActivityLog.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ActivityAction
    }),
    __metadata("design:type", String)
], ActivityLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ActivityLog.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ActivityLog.prototype, "createdAt", void 0);
exports.ActivityLog = ActivityLog = __decorate([
    (0, typeorm_1.Entity)("activity_logs")
], ActivityLog);
