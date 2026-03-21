import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { Team } from "./Team";

export enum TaskStatus {
    TODO = "Todo",
    IN_PROGRESS = "In Progress",
    DONE = "Done"
}

@Entity("tasks")
export class Task {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({
        type: "enum",
        enum: TaskStatus,
        default: TaskStatus.TODO
    })
    status!: TaskStatus;

    @Column({ type: "int", default: 0 })
    completionPercentage!: number;

    @ManyToOne(() => Project, (project) => project.tasks, { nullable: true })
    project?: Project;

    @ManyToOne(() => Team, { nullable: true })
    team?: Team;

    @ManyToOne(() => User, { nullable: true })
    owner?: User;

    @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
    assignedUser?: User;

    @Column({ type: "timestamp", nullable: true })
    completedAt?: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
