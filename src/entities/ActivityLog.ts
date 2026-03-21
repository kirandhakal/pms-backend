import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import { Task } from "./Task";

export enum ActivityAction {
    ORGANIZATION_CREATED = "OrganizationCreated",
    MEMBER_INVITED = "MemberInvited",
    MEMBER_ADDED = "MemberAdded",
    MEMBER_JOINED = "MemberJoined",
    MEMBER_REMOVED = "MemberRemoved",
    MEMBER_ROLE_UPDATED = "MemberRoleUpdated",
    TASK_CREATED = "TaskCreated",
    TASK_STATUS_UPDATED = "TaskStatusUpdated"
}

@Entity("activity_logs")
export class ActivityLog {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Team, { nullable: true })
    team?: Team;

    @ManyToOne(() => User, { nullable: true })
    actor?: User;

    @ManyToOne(() => User, { nullable: true })
    targetUser?: User;

    @ManyToOne(() => Task, { nullable: true })
    task?: Task;

    @Column({
        type: "enum",
        enum: ActivityAction
    })
    action!: ActivityAction;

    @Column({ type: "text", nullable: true })
    details?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
