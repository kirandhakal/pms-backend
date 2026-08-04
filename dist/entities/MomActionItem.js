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
exports.MomActionItem = exports.MomActionItemStatus = void 0;
const typeorm_1 = require("typeorm");
const MinutesOfMeeting_1 = require("./MinutesOfMeeting");
const User_1 = require("./User");
const Task_1 = require("./Task");
var MomActionItemStatus;
(function (MomActionItemStatus) {
    MomActionItemStatus["OPEN"] = "OPEN";
    MomActionItemStatus["DONE"] = "DONE";
})(MomActionItemStatus || (exports.MomActionItemStatus = MomActionItemStatus = {}));
let MomActionItem = class MomActionItem {
};
exports.MomActionItem = MomActionItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], MomActionItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => MinutesOfMeeting_1.MinutesOfMeeting, (mom) => mom.actionItems, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "momId" }),
    __metadata("design:type", MinutesOfMeeting_1.MinutesOfMeeting)
], MomActionItem.prototype, "mom", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MomActionItem.prototype, "momId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], MomActionItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "assigneeId" }),
    __metadata("design:type", User_1.User)
], MomActionItem.prototype, "assignee", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MomActionItem.prototype, "assigneeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", String)
], MomActionItem.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task_1.Task, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "convertedTaskId" }),
    __metadata("design:type", Task_1.Task)
], MomActionItem.prototype, "convertedTask", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MomActionItem.prototype, "convertedTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: MomActionItemStatus, default: MomActionItemStatus.OPEN }),
    __metadata("design:type", String)
], MomActionItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MomActionItem.prototype, "createdAt", void 0);
exports.MomActionItem = MomActionItem = __decorate([
    (0, typeorm_1.Entity)("mom_action_items")
], MomActionItem);
