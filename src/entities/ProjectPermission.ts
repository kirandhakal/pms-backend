import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    Unique,
    UpdateDateColumn
} from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { ProjectPermissionKey } from "../constants/project-access";

@Entity("project_permissions")
@Unique(["project", "user", "permission"])
export class ProjectPermission {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Project, (project) => project.projectPermissions, { onDelete: "CASCADE" })
    project!: Project;

    @ManyToOne(() => User, (user) => user.projectPermissions, { onDelete: "CASCADE" })
    user!: User;

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    grantedBy?: User;

    @Column({
        type: "varchar"
    })
    permission!: ProjectPermissionKey;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
