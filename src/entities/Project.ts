import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { Team } from "./Team";
import { Task } from "./Task";

@Entity("projects")
export class Project {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @ManyToOne(() => User, (user) => user.managedProjects)
    manager!: User;

    @ManyToOne(() => Team, (team) => team.projects)
    team!: Team;

    @OneToMany(() => Task, (task) => task.project)
    tasks!: Task[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
