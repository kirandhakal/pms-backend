import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, Unique } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import { PermissionKey } from "../constants/access";

@Entity("organization_permissions")
@Unique(["team", "user", "permission"])
export class OrganizationPermission {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Team, { nullable: false, onDelete: "CASCADE" })
    team!: Team;

    @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
    user!: User;

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    grantedBy?: User;

    @Column({
        type: "enum",
        enum: PermissionKey
    })
    permission!: PermissionKey;

    @CreateDateColumn()
    createdAt!: Date;
}
