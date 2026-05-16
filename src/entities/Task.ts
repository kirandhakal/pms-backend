import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { Workflow } from "./Workflow";
import { WorkflowStage } from "./WorkflowStage";
import { Department } from "./Department";

export enum TaskStatus {
    TODO = "Todo",
    IN_PROGRESS = "In Progress",
    DONE = "Done"
}

export enum TaskPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}

export interface TaskMetadata {
    labels?: string[];
    customFields?: Record<string, any>;
    attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
    }>;
    checklist?: Array<{
        id: string;
        text: string;
        completed: boolean;
    }>;
    estimatedHours?: number;
    actualHours?: number;
}

@Entity("tasks")
export class Task {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({
        type: "enum",
        enum: TaskStatus,
        default: TaskStatus.TODO
    })
    status!: TaskStatus;

    @Column({
        type: "enum",
        enum: TaskPriority,
        default: TaskPriority.MEDIUM
    })
    priority!: TaskPriority;

    @Column({ type: "int", default: 0 })
    completionPercentage!: number;

    // Legacy project relationship
    @ManyToOne(() => Project, (project) => project.tasks, { nullable: true })
    @JoinColumn({ name: "projectId" })
    project?: Project;

    @Column({ nullable: true })
    projectId?: string;

    // New workflow system
    @ManyToOne(() => Workflow, (workflow) => workflow.tasks, { nullable: true })
    @JoinColumn({ name: "workflowId" })
    workflow?: Workflow;

    @Column({ nullable: true })
    @Index()
    workflowId?: string;

    @ManyToOne(() => WorkflowStage, (stage) => stage.tasks, { nullable: true })
    @JoinColumn({ name: "stageId" })
    stage?: WorkflowStage;

    @Column({ nullable: true })
    @Index()
    stageId?: string;

    // Department assignment
    @ManyToOne(() => Department, (department) => department.tasks, { nullable: true })
    @JoinColumn({ name: "departmentId" })
    department?: Department;

    @Column({ nullable: true })
    @Index()
    departmentId?: string;

    // User assignments
    @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
    @JoinColumn({ name: "assigneeId" })
    assignedUser?: User;

    @Column({ nullable: true })
    @Index()
    assigneeId?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "createdById" })
    createdBy?: User;

    @Column({ nullable: true })
    createdById?: string;

    // Dates
    @Column({ type: "timestamp", nullable: true })
    dueDate?: Date;

    @Column({ type: "timestamp", nullable: true })
    startDate?: Date;

    @Column({ type: "timestamp", nullable: true })
    completedAt?: Date;

    // Order within stage (for drag-drop)
    @Column({ type: "int", default: 0 })
    order!: number;

    // Rich metadata
    @Column({ type: "jsonb", nullable: true })
    metadata?: TaskMetadata;

    @Column({ default: false })
    isArchived!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
