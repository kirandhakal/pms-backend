import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from "typeorm";
import { User } from "./User";
import { Project } from "./Project";
import { OrganizationPermission } from "./OrganizationPermission";

@Entity("teams")
export class Team {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @OneToMany(() => User, (user) => user.team)
    members!: User[];

    @OneToMany(() => Project, (project) => project.team)
    projects!: Project[];

    @OneToMany(() => OrganizationPermission, (permission) => permission.team)
    permissions!: OrganizationPermission[];

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    createdBy?: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
