import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { UserRole } from "./User";
import { Project } from "./Project";
import { Team } from "./Team";

@Entity("invitations")
export class Invitation {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    email!: string;

    @Column({ unique: true })
    token!: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.TEAM_MEMBER
    })
    role!: UserRole;

    @ManyToOne(() => Project, { nullable: true })
    project?: Project;

    @ManyToOne(() => Team, { nullable: true })
    team?: Team;

    @Column({ type: "timestamp" })
    expiresAt!: Date;

    @Column({ default: false })
    isUsed!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
