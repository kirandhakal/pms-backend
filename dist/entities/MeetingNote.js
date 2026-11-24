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
exports.MeetingNote = void 0;
const typeorm_1 = require("typeorm");
const Meeting_1 = require("./Meeting");
const User_1 = require("./User");
let MeetingNote = class MeetingNote {
};
exports.MeetingNote = MeetingNote;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], MeetingNote.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Meeting_1.Meeting, (meeting) => meeting.notes, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "meetingId" }),
    __metadata("design:type", Meeting_1.Meeting)
], MeetingNote.prototype, "meeting", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MeetingNote.prototype, "meetingId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "authorId" }),
    __metadata("design:type", User_1.User)
], MeetingNote.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MeetingNote.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], MeetingNote.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MeetingNote.prototype, "createdAt", void 0);
exports.MeetingNote = MeetingNote = __decorate([
    (0, typeorm_1.Entity)("meeting_notes")
], MeetingNote);
