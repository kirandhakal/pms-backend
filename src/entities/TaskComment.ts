import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm";
import { Task } from "./Task";
import { User } from "./User";

@Entity("task_comments")
@Index(["taskId", "createdAt"])
@Index(["taskId", "userId", "clientMessageId"], { unique: true })
export class TaskComment {
    @Column({ type: "bigint", default: "0" })
    chatVersion!: string;

    @Column({ type: "uuid", nullable: true })
    replyToMessageId?: string | null;

    @Column({ type: "timestamptz", nullable: true })
    pinnedAt?: Date | null;

    @Column({ type: "uuid", nullable: true })
    pinnedById?: string | null;

    @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    chatUpdatedAt!: Date;

    @Column({ type: "uuid", nullable: true })
    clientMessageId?: string;

    @Column({ type: "bigint", generated: "increment" })
    chatSequence!: string;

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Task, { onDelete: "CASCADE" })
    @JoinColumn({ name: "taskId" })
    task!: Task;

    @Column()
    @Index()
    taskId!: string;

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "userId" })
    user?: User;

    @Column({ nullable: true })
    userId?: string;

    @Column({ type: "text" })
    content!: string;

    @Column({ type: "jsonb", nullable: true })
    mentions?: Array<{
        userId: string;
        username: string;
        position: {
            start: number;
            end: number;
        };
    }>;

    @Column({ type: "jsonb", nullable: true })
    attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
    }>;

    @Column({ default: false })
    isEdited!: boolean;

    @Column({ default: false })
    isDeleted!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
