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
exports.Invitation = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Project_1 = require("./Project");
let Invitation = class Invitation {
};
exports.Invitation = Invitation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Invitation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Invitation.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Invitation.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: User_1.UserRole,
        default: User_1.UserRole.USER
    }),
    __metadata("design:type", String)
], Invitation.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { nullable: true }),
    __metadata("design:type", Project_1.Project)
], Invitation.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Invitation.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Invitation.prototype, "isUsed", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Invitation.prototype, "createdAt", void 0);
exports.Invitation = Invitation = __decorate([
    (0, typeorm_1.Entity)("invitations")
], Invitation);
