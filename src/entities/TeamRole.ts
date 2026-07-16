import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
    Unique,
} from "typeorm";
import { Organization } from "./Organization";
import { TeamMembership } from "./TeamMembership";

@Entity("team_roles")
@Unique(["organizationId", "name"])
export class TeamRole {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Organization, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization!: Organization;

    @Column()
    @Index()
    organizationId!: string;

    @Column({ length: 100 })
    name!: string;

    @Column({ default: false })
    isSystem!: boolean;

    @OneToMany(() => TeamMembership, (m) => m.teamRole)
    memberships!: TeamMembership[];

    @CreateDateColumn()
    createdAt!: Date;
}
