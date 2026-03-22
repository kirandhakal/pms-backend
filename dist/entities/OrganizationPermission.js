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
exports.OrganizationPermission = void 0;
const typeorm_1 = require("typeorm");
const Team_1 = require("./Team");
const User_1 = require("./User");
const access_1 = require("../constants/access");
let OrganizationPermission = class OrganizationPermission {
};
exports.OrganizationPermission = OrganizationPermission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], OrganizationPermission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, { nullable: false, onDelete: "CASCADE" }),
    __metadata("design:type", Team_1.Team)
], OrganizationPermission.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: false, onDelete: "CASCADE" }),
    __metadata("design:type", User_1.User)
], OrganizationPermission.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true, onDelete: "SET NULL" }),
    __metadata("design:type", User_1.User)
], OrganizationPermission.prototype, "grantedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: access_1.PermissionKey
    }),
    __metadata("design:type", String)
], OrganizationPermission.prototype, "permission", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrganizationPermission.prototype, "createdAt", void 0);
exports.OrganizationPermission = OrganizationPermission = __decorate([
    (0, typeorm_1.Entity)("organization_permissions"),
    (0, typeorm_1.Unique)(["team", "user", "permission"])
], OrganizationPermission);
