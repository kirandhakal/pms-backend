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
exports.ProjectMember = exports.ProjectMemberRole = void 0;
const typeorm_1 = require("typeorm");
const Project_1 = require("./Project");
const User_1 = require("./User");
var ProjectMemberRole;
(function (ProjectMemberRole) {
    ProjectMemberRole["PROJECT_MANAGER"] = "PROJECT_MANAGER";
    ProjectMemberRole["TEAM_LEAD"] = "TEAM_LEAD";
    ProjectMemberRole["FRONTEND"] = "FRONTEND";
    ProjectMemberRole["BACKEND"] = "BACKEND";
    ProjectMemberRole["TESTER"] = "TESTER";
    ProjectMemberRole["DEVOPS"] = "DEVOPS";
    ProjectMemberRole["MEMBER"] = "MEMBER";
})(ProjectMemberRole || (exports.ProjectMemberRole = ProjectMemberRole = {}));
let ProjectMember = class ProjectMember {
};
exports.ProjectMember = ProjectMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ProjectMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, (project) => project.members, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "projectId" }),
    __metadata("design:type", Project_1.Project)
], ProjectMember.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ProjectMember.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], ProjectMember.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ProjectMember.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ProjectMemberRole, default: ProjectMemberRole.MEMBER }),
    __metadata("design:type", String)
], ProjectMember.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectMember.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ProjectMember.prototype, "updatedAt", void 0);
exports.ProjectMember = ProjectMember = __decorate([
    (0, typeorm_1.Entity)("project_members"),
    (0, typeorm_1.Unique)(["projectId", "userId"])
], ProjectMember);
