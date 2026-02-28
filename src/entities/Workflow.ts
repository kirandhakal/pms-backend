import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index
} from "typeorm";
import { Organization } from "./Organization";
import { User } from "./User";
import { WorkflowStage } from "./WorkflowStage";
import { Task } from "./Task";

export interface WorkflowSettings {
    allowBackwardTransition?: boolean;
    requireAssignee?: boolean;
    autoAssignOnCreate?: boolean;
    notifyOnStageChange?: boolean;
    defaultAssigneeId?: string;
}

export interface WorkflowTransition {
    fromStageId: string;
    toStageId: string;
    conditions?: {
        requiredFields?: string[];
        requiredPermissions?: string[];
        validationRules?: any[];
    };
}

@Entity("workflows")
export class Workflow {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @ManyToOne(() => Organization, (organization) => organization.workflows, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization!: Organization;

    @Column()
    @Index()
    organizationId!: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "createdById" })
    createdBy?: User;

    @Column({ nullable: true })
    createdById?: string;

    @OneToMany(() => WorkflowStage, (stage) => stage.workflow, { cascade: true })
    stages!: WorkflowStage[];

    @OneToMany(() => Task, (task) => task.workflow)
    tasks!: Task[];

    @Column({ type: "jsonb", nullable: true })
    settings?: WorkflowSettings;

    @Column({ type: "jsonb", nullable: true })
    transitions?: WorkflowTransition[];

    @Column({ default: true })
    isDefault!: boolean;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
