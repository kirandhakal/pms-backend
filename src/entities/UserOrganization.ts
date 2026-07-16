import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique
} from "typeorm";
import { User } from "./User";
import { Organization } from "./Organization";

export enum OrgMemberRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
    GUEST = "GUEST"
}

@Entity("user_organizations")
@Unique(["userId", "organizationId"])
export class UserOrganization {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, (user) => user.userOrganizations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    @Index()
    userId!: string;

    @ManyToOne(() => Organization, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization!: Organization;

    @Column()
    @Index()
    organizationId!: string;

    @Column({ type: "enum", enum: OrgMemberRole, default: OrgMemberRole.MEMBER })
    role!: OrgMemberRole;

    @CreateDateColumn()
    joinedAt!: Date;
}
