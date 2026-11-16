import { randomUUID } from 'crypto';
import { TextDecoder } from 'util';
import { fromBuffer } from 'file-type';
import { In } from 'typeorm';
import { z } from 'zod';
import { AppDataSource as db } from '../config/data-source';
import { ProjectDocument, ProjectDocumentLink } from '../entities/ProjectAssets';
import { ProjectMemberRole } from '../entities/ProjectMember';
import { organizationAccess, projectAccess, requireManagement } from './ProjectAccess';
import { chatStorageService } from './ChatStorageService';
import { storageConfigured } from './ChatAttachmentService';
import { ApiError } from '../middlewares/errorHandler';

export const documentTypes:Record<string,string>={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',csv:'text/csv',txt:'text/plain'};
export const documentLimit=()=>Math.min(100,Math.max(1,Number(process.env.DOCUMENT_MAX_FILE_SIZE_MB)||10))*1024*1024;
export const documentDto=(d:ProjectDocument)=>({id:d.id,name:d.name,mimeType:d.mimeType,size:d.size,roles:d.roles,projectId:d.projectId,createdAt:d.createdAt});
export async function canReadDocument(userId:string,orgId:string,d:ProjectDocument) {
 if(d.organizationId!==orgId||d.status!=='ready')return false;
 try {const a=d.projectId?await projectAccess(userId,d.projectId,orgId):await organizationAccess(userId,orgId);return !d.roles.length||d.roles.includes(a.role);} catch(e) {if(e instanceof ApiError&&(e.statusCode===403||e.statusCode===404))return false;throw e;}
}
export async function documentList(userId:string,orgId:string,projectId:string,library:boolean) {
 await projectAccess(userId,projectId,orgId);
 const links=library?[]:await db.getRepository(ProjectDocumentLink).findBy({projectId});
 const documents=await db.getRepository(ProjectDocument).find({where:{organizationId:orgId,status:'ready'},order:{createdAt:'DESC'}});
 const result=[];
 for(const d of documents)if((library?!d.projectId:d.projectId===projectId||links.some(l=>l.documentId===d.id))&&await canReadDocument(userId,orgId,d))result.push(documentDto(d));
 return result;
}
export async function beginDocument(userId:string,orgId:string,projectId:string,input:unknown) {
 const a=await projectAccess(userId,projectId,orgId);
 const data=z.object({name:z.string().trim().min(1).max(200).refine(s=>!/[\\/\x00-\x1f]/.test(s)),size:z.number().int().positive().max(documentLimit()),library:z.boolean().default(false),roles:z.array(z.string()).max(20).default([])}).parse(input);
 if(data.library?!a.admin:!a.manage)throw new ApiError('Document management permission required',403);
 if(!storageConfigured())throw new ApiError('Private document storage is not configured',503);
 const allowed=data.library?['OWNER','ADMIN','MEMBER','GUEST']:Object.values(ProjectMemberRole);
 if(data.roles.some(r=>!allowed.includes(r)))throw new ApiError('Invalid document scope role',400);
 // Restricted files are never implicitly readable by managers.
 if(data.roles.length&&!data.roles.includes(data.library?(await organizationAccess(userId,orgId)).role:a.role))throw new ApiError('Include your own role so you can manage this upload',400);
 const mimeType=documentTypes[data.name.split('.').pop()!.toLowerCase()];
 if(!mimeType)throw new ApiError('Unsupported document type',415);
 const doc=await db.getRepository(ProjectDocument).save(db.getRepository(ProjectDocument).create({organizationId:orgId,projectId:data.library?null:projectId,name:data.name,size:data.size,roles:[...new Set(data.roles)],mimeType,uploaderId:userId,storageKey:`documents/${orgId}/${randomUUID()}`}));
 return {id:doc.id,mimeType:doc.mimeType};
}
export async function validateDocumentBytes(body:Buffer,name:string,mimeType:string,size:number) {
 if(!Buffer.isBuffer(body)||body.length!==size||body.length>documentLimit())throw new ApiError('Document size mismatch',400);
 if(documentTypes[name.split('.').pop()!.toLowerCase()]!==mimeType)throw new ApiError('Unsupported document type',415);
 if(mimeType==='text/plain'||mimeType==='text/csv') {
  try {const text=new TextDecoder('utf-8',{fatal:true}).decode(body);if(text.includes('\0'))throw new Error();}catch{throw new ApiError('Expected UTF-8 text',415);}
 }else {const detected=await fromBuffer(body);if(detected?.mime!==mimeType)throw new ApiError('Document contents do not match its extension',415);}
}
export async function uploadDocument(userId:string,orgId:string,id:string,body:Buffer) {
 const d=await db.getRepository(ProjectDocument).createQueryBuilder('d').addSelect('d.storageKey').where('d.id=:id AND d.organizationId=:orgId',{id,orgId}).getOne();
 if(!d||d.uploaderId!==userId||d.status!=='pending'||Date.now()-d.createdAt.getTime()>86400000)throw new ApiError('Pending upload not found or expired',404);
 const a=d.projectId?await projectAccess(userId,d.projectId,orgId):await organizationAccess(userId,orgId);
 if(d.projectId)requireManagement(a as Awaited<ReturnType<typeof projectAccess>>);else if(!a.admin)throw new ApiError('Organization admin required',403);
 await validateDocumentBytes(body,d.name,d.mimeType,d.size);
 const claimed=await db.getRepository(ProjectDocument).update({id,status:'pending'},{status:'uploading'});
 if(!claimed.affected)throw new ApiError('Upload already in progress',409);
 try {await chatStorageService.put(d.storageKey,body,d.mimeType);await db.getRepository(ProjectDocument).update({id},{status:'ready'});}catch(e){await db.getRepository(ProjectDocument).update({id},{status:'pending'});throw e;}
 return documentDto(d);
}
export async function documentContent(userId:string,orgId:string,id:string) {
 const d=await db.getRepository(ProjectDocument).createQueryBuilder('d').addSelect('d.storageKey').where('d.id=:id AND d.organizationId=:orgId',{id,orgId}).getOne();
 if(!d||!await canReadDocument(userId,orgId,d))throw new ApiError('Document not found or access denied',403);
 return {document:d,object:await chatStorageService.get(d.storageKey)};
}
export async function linkDocument(userId:string,orgId:string,projectId:string,id:string) {
 const a=await projectAccess(userId,projectId,orgId);requireManagement(a);
 const d=await db.getRepository(ProjectDocument).findOneBy({id,organizationId:orgId});
 if(!d||d.projectId||!await canReadDocument(userId,orgId,d))throw new ApiError('Organization document not accessible',403);
 await db.getRepository(ProjectDocumentLink).upsert({projectId,documentId:id},['projectId','documentId']);
}
