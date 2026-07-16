import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { MinutesOfMeeting } from "./MinutesOfMeeting";
import { User } from "./User";
import { Task } from "./Task";

export enum MomActionItemStatus {
    OPEN = "OPEN",
    DONE = "DONE",
}

@Entity("mom_action_items")
export class MomActionItem {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => MinutesOfMeeting, (mom) => mom.actionItems, { onDelete: "CASCADE" })
    @JoinColumn({ name: "momId" })
    mom!: MinutesOfMeeting;

    @Column()
    @Index()
    momId!: string;

    @Column({ type: "text" })
    description!: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "assigneeId" })
    assignee?: User;

    @Column({ nullable: true })
    assigneeId?: string;

    @Column({ type: "date", nullable: true })
    dueDate?: string;

    @ManyToOne(() => Task, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "convertedTaskId" })
    convertedTask?: Task;

    @Column({ nullable: true })
    convertedTaskId?: string;

    @Column({ type: "enum", enum: MomActionItemStatus, default: MomActionItemStatus.OPEN })
    status!: MomActionItemStatus;

    @CreateDateColumn()
    createdAt!: Date;
}
