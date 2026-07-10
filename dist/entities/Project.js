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
exports.Project = exports.ProjectStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Team_1 = require("./Team");
const Task_1 = require("./Task");
const Workflow_1 = require("./Workflow");
const ProjectMember_1 = require("./ProjectMember");
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["PLANNING"] = "planning";
    ProjectStatus["ACTIVE"] = "active";
    ProjectStatus["COMPLETED"] = "completed";
    ProjectStatus["ON_HOLD"] = "on_hold";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
let Project = class Project {
};
exports.Project = Project;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Project.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Project.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Project.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Project.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.managedProjects),
    (0, typeorm_1.JoinColumn)({ name: "managerId" }),
    __metadata("design:type", User_1.User)
], Project.prototype, "manager", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Project.prototype, "managerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "teamLeadId" }),
    __metadata("design:type", User_1.User)
], Project.prototype, "teamLead", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Project.prototype, "teamLeadId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, (team) => team.projects),
    (0, typeorm_1.JoinColumn)({ name: "teamId" }),
    __metadata("design:type", Team_1.Team)
], Project.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Project.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "workflowId" }),
    __metadata("design:type", Workflow_1.Workflow)
], Project.prototype, "workflow", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Project.prototype, "workflowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Project.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Project.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ProjectStatus, default: ProjectStatus.ACTIVE }),
    __metadata("design:type", String)
], Project.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Task_1.Task, (task) => task.project),
    __metadata("design:type", Array)
], Project.prototype, "tasks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ProjectMember_1.ProjectMember, (member) => member.project),
    __metadata("design:type", Array)
], Project.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Project.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Project.prototype, "updatedAt", void 0);
exports.Project = Project = __decorate([
    (0, typeorm_1.Entity)("projects")
], Project);
