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
exports.TeamMembership = void 0;
const typeorm_1 = require("typeorm");
const Team_1 = require("./Team");
const User_1 = require("./User");
const TeamRole_1 = require("./TeamRole");
let TeamMembership = class TeamMembership {
};
exports.TeamMembership = TeamMembership;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TeamMembership.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "teamId" }),
    __metadata("design:type", Team_1.Team)
], TeamMembership.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TeamMembership.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], TeamMembership.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TeamMembership.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TeamRole_1.TeamRole, (role) => role.memberships, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: "teamRoleId" }),
    __metadata("design:type", TeamRole_1.TeamRole)
], TeamMembership.prototype, "teamRole", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TeamMembership.prototype, "teamRoleId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TeamMembership.prototype, "joinedAt", void 0);
exports.TeamMembership = TeamMembership = __decorate([
    (0, typeorm_1.Entity)("team_memberships"),
    (0, typeorm_1.Unique)(["teamId", "userId"])
], TeamMembership);
