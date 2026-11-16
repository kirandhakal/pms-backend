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
exports.ResourceAllocation = exports.OrganizationResource = exports.ProjectDocumentLink = exports.ProjectDocument = void 0;
const typeorm_1 = require("typeorm");
const Project_1 = require("./Project");
const Organization_1 = require("./Organization");
const User_1 = require("./User");
let ProjectDocument = class ProjectDocument {
};
exports.ProjectDocument = ProjectDocument;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProjectDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ProjectDocument.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organization_1.Organization, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organizationId' }),
    __metadata("design:type", Organization_1.Organization)
], ProjectDocument.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ProjectDocument.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'projectId' }),
    __metadata("design:type", Project_1.Project)
], ProjectDocument.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectDocument.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectDocument.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], ProjectDocument.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false }),
    __metadata("design:type", String)
], ProjectDocument.prototype, "storageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], ProjectDocument.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: () => "'[]'::jsonb" }),
    __metadata("design:type", Array)
], ProjectDocument.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectDocument.prototype, "uploaderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'uploaderId' }),
    __metadata("design:type", User_1.User)
], ProjectDocument.prototype, "uploader", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectDocument.prototype, "createdAt", void 0);
exports.ProjectDocument = ProjectDocument = __decorate([
    (0, typeorm_1.Entity)('project_documents')
], ProjectDocument);
let ProjectDocumentLink = class ProjectDocumentLink {
};
exports.ProjectDocumentLink = ProjectDocumentLink;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProjectDocumentLink.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ProjectDocumentLink.prototype, "documentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ProjectDocument, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'documentId' }),
    __metadata("design:type", ProjectDocument)
], ProjectDocumentLink.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ProjectDocumentLink.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'projectId' }),
    __metadata("design:type", Project_1.Project)
], ProjectDocumentLink.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectDocumentLink.prototype, "createdAt", void 0);
exports.ProjectDocumentLink = ProjectDocumentLink = __decorate([
    (0, typeorm_1.Entity)('project_document_links'),
    (0, typeorm_1.Unique)(['documentId', 'projectId'])
], ProjectDocumentLink);
let OrganizationResource = class OrganizationResource {
};
exports.OrganizationResource = OrganizationResource;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrganizationResource.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], OrganizationResource.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organization_1.Organization, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'organizationId' }),
    __metadata("design:type", Organization_1.Organization)
], OrganizationResource.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrganizationResource.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'asset' }),
    __metadata("design:type", String)
], OrganizationResource.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], OrganizationResource.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrganizationResource.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'ownerId' }),
    __metadata("design:type", User_1.User)
], OrganizationResource.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrganizationResource.prototype, "createdAt", void 0);
exports.OrganizationResource = OrganizationResource = __decorate([
    (0, typeorm_1.Entity)('organization_resources')
], OrganizationResource);
let ResourceAllocation = class ResourceAllocation {
};
exports.ResourceAllocation = ResourceAllocation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ResourceAllocation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ResourceAllocation.prototype, "resourceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => OrganizationResource, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'resourceId' }),
    __metadata("design:type", OrganizationResource)
], ResourceAllocation.prototype, "resource", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ResourceAllocation.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'projectId' }),
    __metadata("design:type", Project_1.Project)
], ResourceAllocation.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", String)
], ResourceAllocation.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", String)
], ResourceAllocation.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], ResourceAllocation.prototype, "releasedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ResourceAllocation.prototype, "allocatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ResourceAllocation.prototype, "createdAt", void 0);
exports.ResourceAllocation = ResourceAllocation = __decorate([
    (0, typeorm_1.Entity)('project_resource_allocations'),
    (0, typeorm_1.Index)(['resourceId', 'startDate', 'endDate'])
], ResourceAllocation);
