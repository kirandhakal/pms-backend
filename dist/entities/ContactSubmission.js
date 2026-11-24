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
exports.ContactSubmission = exports.ContactStatus = void 0;
const typeorm_1 = require("typeorm");
var ContactStatus;
(function (ContactStatus) {
    ContactStatus["NEW"] = "NEW";
    ContactStatus["READ"] = "READ";
    ContactStatus["RESOLVED"] = "RESOLVED";
})(ContactStatus || (exports.ContactStatus = ContactStatus = {}));
let ContactSubmission = class ContactSubmission {
};
exports.ContactSubmission = ContactSubmission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ContactSubmission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], ContactSubmission.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 180 }),
    __metadata("design:type", String)
], ContactSubmission.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 160 }),
    __metadata("design:type", String)
], ContactSubmission.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], ContactSubmission.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ContactStatus, default: ContactStatus.NEW }),
    __metadata("design:type", String)
], ContactSubmission.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContactSubmission.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ContactSubmission.prototype, "updatedAt", void 0);
exports.ContactSubmission = ContactSubmission = __decorate([
    (0, typeorm_1.Entity)("contact_submissions")
], ContactSubmission);
