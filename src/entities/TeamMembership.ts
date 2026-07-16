import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import { TeamRole } from "./TeamRole";

@Entity("team_memberships")
@Unique(["teamId", "userId"])
export class TeamMembership {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Team, { onDelete: "CASCADE" })
    @JoinColumn({ name: "teamId" })
    team!: Team;

    @Column()
    @Index()
    teamId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    @Index()
    userId!: string;

    @ManyToOne(() => TeamRole, (role) => role.memberships, { eager: true })
    @JoinColumn({ name: "teamRoleId" })
    teamRole!: TeamRole;

    @Column()
    @Index()
    teamRoleId!: string;

    @CreateDateColumn()
    joinedAt!: Date;
}
