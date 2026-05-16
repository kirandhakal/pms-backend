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
exports.WorkflowStage = void 0;
const typeorm_1 = require("typeorm");
const Workflow_1 = require("./Workflow");
const Task_1 = require("./Task");
let WorkflowStage = class WorkflowStage {
};
exports.WorkflowStage = WorkflowStage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], WorkflowStage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WorkflowStage.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], WorkflowStage.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, (workflow) => workflow.stages, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "workflowId" }),
    __metadata("design:type", Workflow_1.Workflow)
], WorkflowStage.prototype, "workflow", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WorkflowStage.prototype, "workflowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WorkflowStage.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "#6b7280" }) // Default gray color
    ,
    __metadata("design:type", String)
], WorkflowStage.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WorkflowStage.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], WorkflowStage.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], WorkflowStage.prototype, "isFinal", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Task_1.Task, (task) => task.stage),
    __metadata("design:type", Array)
], WorkflowStage.prototype, "tasks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], WorkflowStage.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], WorkflowStage.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowStage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowStage.prototype, "updatedAt", void 0);
exports.WorkflowStage = WorkflowStage = __decorate([
    (0, typeorm_1.Entity)("workflow_stages")
], WorkflowStage);
