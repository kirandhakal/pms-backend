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
exports.ProjectMessage = void 0;
const typeorm_1 = require("typeorm");
const Project_1 = require("./Project");
const User_1 = require("./User");
let ProjectMessage = class ProjectMessage {
};
exports.ProjectMessage = ProjectMessage;
__decorate([
    (0, typeorm_1.Column)({ type: "bigint", default: "0" }),
    __metadata("design:type", String)
], ProjectMessage.prototype, "chatVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", Object)
], ProjectMessage.prototype, "replyToMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Object)
], ProjectMessage.prototype, "pinnedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", Object)
], ProjectMessage.prototype, "pinnedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], ProjectMessage.prototype, "chatUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ProjectMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectMessage.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "projectId" }),
    __metadata("design:type", Project_1.Project)
], ProjectMessage.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectMessage.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], ProjectMessage.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], ProjectMessage.prototype, "clientMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bigint", generated: "increment" }),
    __metadata("design:type", String)
], ProjectMessage.prototype, "chatSequence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], ProjectMessage.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ProjectMessage.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectMessage.prototype, "createdAt", void 0);
exports.ProjectMessage = ProjectMessage = __decorate([
    (0, typeorm_1.Entity)("project_messages"),
    (0, typeorm_1.Index)(["projectId", "userId", "clientMessageId"], { unique: true })
], ProjectMessage);
