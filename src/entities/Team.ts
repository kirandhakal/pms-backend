import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { Project } from "./Project";
import { TeamMembership } from "./TeamMembership";

@Entity("teams")
export class Team {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    createdById?: string;

    @OneToMany(() => User, (user) => user.team)
    members!: User[];

    @OneToMany(() => Project, (project) => project.team)
    projects!: Project[];

    @OneToMany(() => TeamMembership, (m) => m.team)
    memberships!: TeamMembership[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
