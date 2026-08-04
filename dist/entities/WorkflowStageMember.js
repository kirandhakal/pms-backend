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
exports.WorkflowStageMember = void 0;
const typeorm_1 = require("typeorm");
const WorkflowStage_1 = require("./WorkflowStage");
const User_1 = require("./User");
let WorkflowStageMember = class WorkflowStageMember {
};
exports.WorkflowStageMember = WorkflowStageMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], WorkflowStageMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowStage_1.WorkflowStage, (stage) => stage.stageMembers, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "stageId" }),
    __metadata("design:type", WorkflowStage_1.WorkflowStage)
], WorkflowStageMember.prototype, "stage", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WorkflowStageMember.prototype, "stageId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], WorkflowStageMember.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WorkflowStageMember.prototype, "userId", void 0);
exports.WorkflowStageMember = WorkflowStageMember = __decorate([
    (0, typeorm_1.Entity)("workflow_stage_members"),
    (0, typeorm_1.Unique)(["stageId", "userId"])
], WorkflowStageMember);
