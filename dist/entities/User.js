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
exports.User = exports.UserRole = exports.OAuthProvider = void 0;
const typeorm_1 = require("typeorm");
const Team_1 = require("./Team");
const Project_1 = require("./Project");
const Task_1 = require("./Task");
const OrganizationPermission_1 = require("./OrganizationPermission");
const ProjectPermission_1 = require("./ProjectPermission");
var OAuthProvider;
(function (OAuthProvider) {
    OAuthProvider["GOOGLE"] = "google";
    OAuthProvider["GITHUB"] = "github";
    OAuthProvider["LOCAL"] = "local";
})(OAuthProvider || (exports.OAuthProvider = OAuthProvider = {}));
var UserRole;
(function (UserRole) {
    UserRole["SUDO_ADMIN"] = "SUDO_ADMIN";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["DEPARTMENT_HEAD"] = "DEPARTMENT_HEAD";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["MEMBER"] = "MEMBER";
    UserRole["GUEST"] = "GUEST";
})(UserRole || (exports.UserRole = UserRole = {}));
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: OAuthProvider,
        default: OAuthProvider.LOCAL
    }),
    __metadata("design:type", String)
], User.prototype, "oauthProvider", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "oauthId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        default: UserRole.MEMBER
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, (team) => team.members, { nullable: true }),
    __metadata("design:type", Team_1.Team)
], User.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Project_1.Project, (project) => project.manager),
    __metadata("design:type", Array)
], User.prototype, "managedProjects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Task_1.Task, (task) => task.assignedUser),
    __metadata("design:type", Array)
], User.prototype, "assignedTasks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => OrganizationPermission_1.OrganizationPermission, (permission) => permission.user),
    __metadata("design:type", Array)
], User.prototype, "organizationPermissions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ProjectPermission_1.ProjectPermission, (permission) => permission.user),
    __metadata("design:type", Array)
], User.prototype, "projectPermissions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)("users")
], User);
