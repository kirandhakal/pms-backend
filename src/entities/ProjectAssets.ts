import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './Project';
import { Organization } from './Organization';
import { User } from './User';

@Entity('project_documents')
export class ProjectDocument {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column() @Index() organizationId!: string;
 @ManyToOne(() => Organization, { onDelete: 'CASCADE' }) @JoinColumn({name:'organizationId'}) organization!: Organization;
 @Column({type:'uuid', nullable:true}) projectId!: string | null;
 @ManyToOne(() => Project, {onDelete:'CASCADE'}) @JoinColumn({name:'projectId'}) project?: Project;
 @Column() name!: string;
 @Column() mimeType!: string;
 @Column('int') size!: number;
 @Column({select:false}) storageKey!: string;
 @Column({default:'pending'}) status!: string;
 @Column('jsonb', {default:()=>"'[]'::jsonb"}) roles!: string[];
 @Column() uploaderId!: string;
 @ManyToOne(() => User) @JoinColumn({name:'uploaderId'}) uploader!: User;
 @CreateDateColumn() createdAt!: Date;
}
@Entity('project_document_links')
@Unique(['documentId','projectId'])
export class ProjectDocumentLink {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column('uuid') documentId!: string;
 @ManyToOne(() => ProjectDocument, {onDelete:'CASCADE'}) @JoinColumn({name:'documentId'}) document!: ProjectDocument;
 @Column('uuid') projectId!: string;
 @ManyToOne(() => Project, {onDelete:'CASCADE'}) @JoinColumn({name:'projectId'}) project!: Project;
 @CreateDateColumn() createdAt!: Date;
}
@Entity('organization_resources')
export class OrganizationResource {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column() @Index() organizationId!: string;
 @ManyToOne(() => Organization, {onDelete:'CASCADE'}) @JoinColumn({name:'organizationId'}) organization!: Organization;
 @Column() name!: string;
 @Column({default:'asset'}) kind!: 'asset' | 'link';
 @Column({type:'text',nullable:true}) url!: string | null;
 @Column() ownerId!: string;
 @ManyToOne(() => User) @JoinColumn({name:'ownerId'}) owner!: User;
 @CreateDateColumn() createdAt!: Date;
}
@Entity('project_resource_allocations')
@Index(['resourceId','startDate','endDate'])
export class ResourceAllocation {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column('uuid') resourceId!: string;
 @ManyToOne(() => OrganizationResource, {onDelete:'CASCADE'}) @JoinColumn({name:'resourceId'}) resource!: OrganizationResource;
 @Column('uuid') projectId!: string;
 @ManyToOne(() => Project, {onDelete:'CASCADE'}) @JoinColumn({name:'projectId'}) project!: Project;
 @Column('date') startDate!: string;
 @Column('date') endDate!: string;
 @Column({type:'timestamptz',nullable:true}) releasedAt!: Date | null;
 @Column() allocatedById!: string;
 @CreateDateColumn() createdAt!: Date;
}
