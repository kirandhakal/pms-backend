import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { Task } from "./Task";

@Entity("comments")
export class Comment {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("text")
    content!: string;

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Task, (task) => task.comments)
    task!: Task;

    @CreateDateColumn()
    createdAt!: Date;
}
