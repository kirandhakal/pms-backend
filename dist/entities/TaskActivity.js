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
exports.TaskActivity = exports.TaskActivityType = void 0;
const typeorm_1 = require("typeorm");
const Task_1 = require("./Task");
const User_1 = require("./User");
var TaskActivityType;
(function (TaskActivityType) {
    TaskActivityType["CREATED"] = "created";
    TaskActivityType["UPDATED"] = "updated";
    TaskActivityType["STAGE_CHANGED"] = "stage_changed";
    TaskActivityType["ASSIGNED"] = "assigned";
    TaskActivityType["UNASSIGNED"] = "unassigned";
    TaskActivityType["COMMENT_ADDED"] = "comment_added";
    TaskActivityType["ATTACHMENT_ADDED"] = "attachment_added";
    TaskActivityType["ATTACHMENT_REMOVED"] = "attachment_removed";
    TaskActivityType["PRIORITY_CHANGED"] = "priority_changed";
    TaskActivityType["DUE_DATE_CHANGED"] = "due_date_changed";
    TaskActivityType["COMPLETED"] = "completed";
    TaskActivityType["REOPENED"] = "reopened";
    TaskActivityType["ARCHIVED"] = "archived";
    TaskActivityType["RESTORED"] = "restored";
})(TaskActivityType || (exports.TaskActivityType = TaskActivityType = {}));
let TaskActivity = class TaskActivity {
};
exports.TaskActivity = TaskActivity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TaskActivity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task_1.Task, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "taskId" }),
    __metadata("design:type", Task_1.Task)
], TaskActivity.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TaskActivity.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], TaskActivity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TaskActivity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: TaskActivityType
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TaskActivity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], TaskActivity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], TaskActivity.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], TaskActivity.prototype, "createdAt", void 0);
exports.TaskActivity = TaskActivity = __decorate([
    (0, typeorm_1.Entity)("task_activities"),
    (0, typeorm_1.Index)(["taskId", "createdAt"])
], TaskActivity);
