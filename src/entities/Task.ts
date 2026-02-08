import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Project } from "./Project";
import { Board } from "./Board";
import { User } from "./User";
import { Comment } from "./Comment";

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

    @ManyToOne(() => Project, (project) => project.tasks)
    project!: Project;

    @ManyToOne(() => Board, (board) => board.tasks)
    board!: Board;

    @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
    assignedUser?: User;

    @Column({ type: "timestamp", nullable: true })
    completedAt?: Date;

    @OneToMany(() => Comment, (comment) => comment.task)
    comments!: Comment[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
