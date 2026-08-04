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
exports.TeamRole = void 0;
const typeorm_1 = require("typeorm");
const Organization_1 = require("./Organization");
const TeamMembership_1 = require("./TeamMembership");
let TeamRole = class TeamRole {
};
exports.TeamRole = TeamRole;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TeamRole.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organization_1.Organization, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "organizationId" }),
    __metadata("design:type", Organization_1.Organization)
], TeamRole.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TeamRole.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], TeamRole.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], TeamRole.prototype, "isSystem", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TeamMembership_1.TeamMembership, (m) => m.teamRole),
    __metadata("design:type", Array)
], TeamRole.prototype, "memberships", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TeamRole.prototype, "createdAt", void 0);
exports.TeamRole = TeamRole = __decorate([
    (0, typeorm_1.Entity)("team_roles"),
    (0, typeorm_1.Unique)(["organizationId", "name"])
], TeamRole);
