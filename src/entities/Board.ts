import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Project } from "./Project";
import { Task } from "./Task";
import { BoardMember } from "./BoardMember";

export enum BoardType {
    KANBAN = "Kanban",
    WORKFLOW = "Workflow"
}

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

    @Column({
        type: "enum",
        enum: BoardType,
        default: BoardType.KANBAN
    })
    type!: BoardType;

    @ManyToOne(() => Project, (project) => project.boards)
    project!: Project;

    @OneToMany(() => Task, (task) => task.board)
    tasks!: Task[];

    @OneToMany(() => BoardMember, (member) => member.board)
    members!: BoardMember[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
