import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    ManyToOne,
    OneToMany,
    Index,
    JoinColumn
} from "typeorm";
import { Organization } from "./Organization";
import { User } from "./User";
import { Task } from "./Task";

export interface DepartmentSettings {
    visibility?: "public" | "private" | "restricted";
    allowCrossDepartmentTasks?: boolean;
    defaultWorkflowId?: string;
    notifications?: {
        email?: boolean;
        inApp?: boolean;
    };
}

@Entity("departments")
export class Department {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @ManyToOne(() => Organization, (organization) => organization.departments, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization!: Organization;

    @Column()
    @Index()
    organizationId!: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "managerId" })
    manager?: User;

    @Column({ nullable: true })
    managerId?: string;

    @OneToMany(() => User, (user) => user.department)
    members!: User[];

    @OneToMany(() => Task, (task) => task.department)
    tasks!: Task[];

    @Column({ type: "jsonb", nullable: true })
    settings?: DepartmentSettings;

    @Column({ default: true })
    isVisible!: boolean;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
