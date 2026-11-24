"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentDto = exports.documentLimit = exports.documentTypes = void 0;
exports.canReadDocument = canReadDocument;
exports.documentList = documentList;
exports.beginDocument = beginDocument;
exports.validateDocumentBytes = validateDocumentBytes;
exports.uploadDocument = uploadDocument;
exports.documentContent = documentContent;
exports.linkDocument = linkDocument;
const crypto_1 = require("crypto");
const util_1 = require("util");
const file_type_1 = require("file-type");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const ProjectAssets_1 = require("../entities/ProjectAssets");
const ProjectMember_1 = require("../entities/ProjectMember");
const ProjectAccess_1 = require("./ProjectAccess");
const ChatStorageService_1 = require("./ChatStorageService");
const ChatAttachmentService_1 = require("./ChatAttachmentService");
const errorHandler_1 = require("../middlewares/errorHandler");
exports.documentTypes = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', csv: 'text/csv', txt: 'text/plain' };
const documentLimit = () => Math.min(100, Math.max(1, Number(process.env.DOCUMENT_MAX_FILE_SIZE_MB) || 10)) * 1024 * 1024;
exports.documentLimit = documentLimit;
const documentDto = (d) => ({ id: d.id, name: d.name, mimeType: d.mimeType, size: d.size, roles: d.roles, projectId: d.projectId, createdAt: d.createdAt });
exports.documentDto = documentDto;
async function canReadDocument(userId, orgId, d) {
    if (d.organizationId !== orgId || d.status !== 'ready')
        return false;
    try {
        const a = d.projectId ? await (0, ProjectAccess_1.projectAccess)(userId, d.projectId, orgId) : await (0, ProjectAccess_1.organizationAccess)(userId, orgId);
        return !d.roles.length || d.roles.includes(a.role);
    }
    catch (e) {
        if (e instanceof errorHandler_1.ApiError && (e.statusCode === 403 || e.statusCode === 404))
            return false;
        throw e;
    }
}
async function documentList(userId, orgId, projectId, library) {
    await (0, ProjectAccess_1.projectAccess)(userId, projectId, orgId);
    const links = library ? [] : await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocumentLink).findBy({ projectId });
    const documents = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).find({ where: { organizationId: orgId, status: 'ready' }, order: { createdAt: 'DESC' } });
    const result = [];
    for (const d of documents)
        if ((library ? !d.projectId : d.projectId === projectId || links.some(l => l.documentId === d.id)) && await canReadDocument(userId, orgId, d))
            result.push((0, exports.documentDto)(d));
    return result;
}
async function beginDocument(userId, orgId, projectId, input) {
    const a = await (0, ProjectAccess_1.projectAccess)(userId, projectId, orgId);
    const data = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200).refine(s => !/[\\/\x00-\x1f]/.test(s)), size: zod_1.z.number().int().positive().max((0, exports.documentLimit)()), library: zod_1.z.boolean().default(false), roles: zod_1.z.array(zod_1.z.string()).max(20).default([]) }).parse(input);
    if (data.library ? !a.admin : !a.manage)
        throw new errorHandler_1.ApiError('Document management permission required', 403);
    if (!(0, ChatAttachmentService_1.storageConfigured)())
        throw new errorHandler_1.ApiError('Private document storage is not configured', 503);
    const allowed = data.library ? ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] : Object.values(ProjectMember_1.ProjectMemberRole);
    if (data.roles.some(r => !allowed.includes(r)))
        throw new errorHandler_1.ApiError('Invalid document scope role', 400);
    // Restricted files are never implicitly readable by managers.
    if (data.roles.length && !data.roles.includes(data.library ? (await (0, ProjectAccess_1.organizationAccess)(userId, orgId)).role : a.role))
        throw new errorHandler_1.ApiError('Include your own role so you can manage this upload', 400);
    const mimeType = exports.documentTypes[data.name.split('.').pop().toLowerCase()];
    if (!mimeType)
        throw new errorHandler_1.ApiError('Unsupported document type', 415);
    const doc = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).save(data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).create({ organizationId: orgId, projectId: data.library ? null : projectId, name: data.name, size: data.size, roles: [...new Set(data.roles)], mimeType, uploaderId: userId, storageKey: `documents/${orgId}/${(0, crypto_1.randomUUID)()}` }));
    return { id: doc.id, mimeType: doc.mimeType };
}
async function validateDocumentBytes(body, name, mimeType, size) {
    if (!Buffer.isBuffer(body) || body.length !== size || body.length > (0, exports.documentLimit)())
        throw new errorHandler_1.ApiError('Document size mismatch', 400);
    if (exports.documentTypes[name.split('.').pop().toLowerCase()] !== mimeType)
        throw new errorHandler_1.ApiError('Unsupported document type', 415);
    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
        try {
            const text = new util_1.TextDecoder('utf-8', { fatal: true }).decode(body);
            if (text.includes('\0'))
                throw new Error();
        }
        catch {
            throw new errorHandler_1.ApiError('Expected UTF-8 text', 415);
        }
    }
    else {
        const detected = await (0, file_type_1.fromBuffer)(body);
        if (detected?.mime !== mimeType)
            throw new errorHandler_1.ApiError('Document contents do not match its extension', 415);
    }
}
async function uploadDocument(userId, orgId, id, body) {
    const d = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).createQueryBuilder('d').addSelect('d.storageKey').where('d.id=:id AND d.organizationId=:orgId', { id, orgId }).getOne();
    if (!d || d.uploaderId !== userId || d.status !== 'pending' || Date.now() - d.createdAt.getTime() > 86400000)
        throw new errorHandler_1.ApiError('Pending upload not found or expired', 404);
    const a = d.projectId ? await (0, ProjectAccess_1.projectAccess)(userId, d.projectId, orgId) : await (0, ProjectAccess_1.organizationAccess)(userId, orgId);
    if (d.projectId)
        (0, ProjectAccess_1.requireManagement)(a);
    else if (!a.admin)
        throw new errorHandler_1.ApiError('Organization admin required', 403);
    await validateDocumentBytes(body, d.name, d.mimeType, d.size);
    const claimed = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).update({ id, status: 'pending' }, { status: 'uploading' });
    if (!claimed.affected)
        throw new errorHandler_1.ApiError('Upload already in progress', 409);
    try {
        await ChatStorageService_1.chatStorageService.put(d.storageKey, body, d.mimeType);
        await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).update({ id }, { status: 'ready' });
    }
    catch (e) {
        await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).update({ id }, { status: 'pending' });
        throw e;
    }
    return (0, exports.documentDto)(d);
}
async function documentContent(userId, orgId, id) {
    const d = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).createQueryBuilder('d').addSelect('d.storageKey').where('d.id=:id AND d.organizationId=:orgId', { id, orgId }).getOne();
    if (!d || !await canReadDocument(userId, orgId, d))
        throw new errorHandler_1.ApiError('Document not found or access denied', 403);
    return { document: d, object: await ChatStorageService_1.chatStorageService.get(d.storageKey) };
}
async function linkDocument(userId, orgId, projectId, id) {
    const a = await (0, ProjectAccess_1.projectAccess)(userId, projectId, orgId);
    (0, ProjectAccess_1.requireManagement)(a);
    const d = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocument).findOneBy({ id, organizationId: orgId });
    if (!d || d.projectId || !await canReadDocument(userId, orgId, d))
        throw new errorHandler_1.ApiError('Organization document not accessible', 403);
    await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ProjectDocumentLink).upsert({ projectId, documentId: id }, ['projectId', 'documentId']);
}
