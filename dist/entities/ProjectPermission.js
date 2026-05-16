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
exports.ProjectPermission = void 0;
const typeorm_1 = require("typeorm");
const Project_1 = require("./Project");
const User_1 = require("./User");
const project_access_1 = require("../constants/project-access");
let ProjectPermission = class ProjectPermission {
};
exports.ProjectPermission = ProjectPermission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ProjectPermission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, (project) => project.projectPermissions, { onDelete: "CASCADE" }),
    __metadata("design:type", Project_1.Project)
], ProjectPermission.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.projectPermissions, { onDelete: "CASCADE" }),
    __metadata("design:type", User_1.User)
], ProjectPermission.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true, onDelete: "SET NULL" }),
    __metadata("design:type", User_1.User)
], ProjectPermission.prototype, "grantedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar"
    }),
    __metadata("design:type", String)
], ProjectPermission.prototype, "permission", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectPermission.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ProjectPermission.prototype, "updatedAt", void 0);
exports.ProjectPermission = ProjectPermission = __decorate([
    (0, typeorm_1.Entity)("project_permissions"),
    (0, typeorm_1.Unique)(["project", "user", "permission"])
], ProjectPermission);
