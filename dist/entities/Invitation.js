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
exports.Invitation = exports.InvitationType = exports.InvitationStatus = void 0;
const typeorm_1 = require("typeorm");
const Organization_1 = require("./Organization");
const Department_1 = require("./Department");
const Role_1 = require("./Role");
const User_1 = require("./User");
var InvitationStatus;
(function (InvitationStatus) {
    InvitationStatus["PENDING"] = "pending";
    InvitationStatus["ACCEPTED"] = "accepted";
    InvitationStatus["EXPIRED"] = "expired";
    InvitationStatus["REVOKED"] = "revoked";
})(InvitationStatus || (exports.InvitationStatus = InvitationStatus = {}));
var InvitationType;
(function (InvitationType) {
    InvitationType["ORGANIZATION"] = "organization";
    InvitationType["DEPARTMENT"] = "department";
    InvitationType["PROJECT"] = "project";
})(InvitationType || (exports.InvitationType = InvitationType = {}));
let Invitation = class Invitation {
};
exports.Invitation = Invitation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Invitation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Invitation.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Invitation.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: InvitationType,
        default: InvitationType.ORGANIZATION
    }),
    __metadata("design:type", String)
], Invitation.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organization_1.Organization, (organization) => organization.invitations, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "organizationId" }),
    __metadata("design:type", Organization_1.Organization)
], Invitation.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Invitation.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Department_1.Department, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "departmentId" }),
    __metadata("design:type", Department_1.Department)
], Invitation.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Invitation.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Role_1.Role, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "roleId" }),
    __metadata("design:type", Role_1.Role)
], Invitation.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Invitation.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "invitedById" }),
    __metadata("design:type", User_1.User)
], Invitation.prototype, "invitedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Invitation.prototype, "invitedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Invitation.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: InvitationStatus,
        default: InvitationStatus.PENDING
    }),
    __metadata("design:type", String)
], Invitation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Invitation.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], Invitation.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Invitation.prototype, "createdAt", void 0);
exports.Invitation = Invitation = __decorate([
    (0, typeorm_1.Entity)("invitations")
], Invitation);
