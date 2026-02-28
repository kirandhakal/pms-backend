import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Organization } from "./Organization";
import { Department } from "./Department";
import { Role } from "./Role";
import { User } from "./User";

export enum InvitationStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    EXPIRED = "expired",
    REVOKED = "revoked"
}

export enum InvitationType {
    ORGANIZATION = "organization",
    DEPARTMENT = "department",
    PROJECT = "project"
}

@Entity("invitations")
export class Invitation {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    email!: string;

    @Column({ unique: true })
    @Index()
    token!: string;

    @Column({
        type: "enum",
        enum: InvitationType,
        default: InvitationType.ORGANIZATION
    })
    type!: InvitationType;

    // Organization (required for multi-tenant)
    @ManyToOne(() => Organization, (organization) => organization.invitations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization!: Organization;

    @Column()
    @Index()
    organizationId!: string;

    // Optional department assignment
    @ManyToOne(() => Department, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "departmentId" })
    department?: Department;

    @Column({ nullable: true })
    departmentId?: string;

    // Role to assign
    @ManyToOne(() => Role, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "roleId" })
    role?: Role;

    @Column({ nullable: true })
    roleId?: string;

    // Who sent the invitation
    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "invitedById" })
    invitedBy?: User;

    @Column({ nullable: true })
    invitedById?: string;

    @Column({ type: "timestamp" })
    expiresAt!: Date;

    @Column({
        type: "enum",
        enum: InvitationStatus,
        default: InvitationStatus.PENDING
    })
    status!: InvitationStatus;

    @Column({ type: "text", nullable: true })
    message?: string; // Custom message from inviter

    @Column({ type: "jsonb", nullable: true })
    metadata?: {
        resendCount?: number;
        lastResentAt?: Date;
        acceptedAt?: Date;
        acceptedByUserId?: string;
    };

    @CreateDateColumn()
    createdAt!: Date;
}
