import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm";
import { Task } from "./Task";
import { User } from "./User";

export enum TaskActivityType {
    CREATED = "created",
    UPDATED = "updated",
    STAGE_CHANGED = "stage_changed",
    ASSIGNED = "assigned",
    UNASSIGNED = "unassigned",
    COMMENT_ADDED = "comment_added",
    ATTACHMENT_ADDED = "attachment_added",
    ATTACHMENT_REMOVED = "attachment_removed",
    PRIORITY_CHANGED = "priority_changed",
    DUE_DATE_CHANGED = "due_date_changed",
    COMPLETED = "completed",
    REOPENED = "reopened",
    ARCHIVED = "archived",
    RESTORED = "restored"
}

@Entity("task_activities")
@Index(["taskId", "createdAt"])
export class TaskActivity {
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

    @Column({
        type: "enum",
        enum: TaskActivityType
    })
    @Index()
    type!: TaskActivityType;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "jsonb", nullable: true })
    details?: {
        fromStageId?: string;
        toStageId?: string;
        fromStageName?: string;
        toStageName?: string;
        oldAssigneeId?: string;
        newAssigneeId?: string;
        oldAssigneeName?: string;
        newAssigneeName?: string;
        oldValue?: any;
        newValue?: any;
        fieldName?: string;
    };

    @CreateDateColumn()
    @Index()
    createdAt!: Date;
}
