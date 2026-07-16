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
exports.UserOrganization = exports.OrgMemberRole = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Organization_1 = require("./Organization");
var OrgMemberRole;
(function (OrgMemberRole) {
    OrgMemberRole["OWNER"] = "OWNER";
    OrgMemberRole["ADMIN"] = "ADMIN";
    OrgMemberRole["MEMBER"] = "MEMBER";
    OrgMemberRole["GUEST"] = "GUEST";
})(OrgMemberRole || (exports.OrgMemberRole = OrgMemberRole = {}));
let UserOrganization = class UserOrganization {
};
exports.UserOrganization = UserOrganization;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], UserOrganization.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.userOrganizations, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], UserOrganization.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], UserOrganization.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organization_1.Organization, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "organizationId" }),
    __metadata("design:type", Organization_1.Organization)
], UserOrganization.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], UserOrganization.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: OrgMemberRole, default: OrgMemberRole.MEMBER }),
    __metadata("design:type", String)
], UserOrganization.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserOrganization.prototype, "joinedAt", void 0);
exports.UserOrganization = UserOrganization = __decorate([
    (0, typeorm_1.Entity)("user_organizations"),
    (0, typeorm_1.Unique)(["userId", "organizationId"])
], UserOrganization);
