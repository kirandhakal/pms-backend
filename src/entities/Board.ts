import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Project } from "./Project";
import { Task } from "./Task";

@Entity("boards")
export class Board {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    title!: string;

    @Column({ nullable: true })
    color?: string;

    @Column({ default: 0 })
    order!: number;

    @ManyToOne(() => Project, (project) => project.boards)
    project!: Project;

    @OneToMany(() => Task, (task) => task.board)
    tasks!: Task[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
