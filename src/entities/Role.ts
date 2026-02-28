import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    ManyToOne,
    OneToMany,
    ManyToMany,
    JoinTable,
    JoinColumn,
    Index
} from "typeorm";
import { Organization } from "./Organization";
import { Permission } from "./Permission";
import { User } from "./User";
import { RoleLevel } from "../config/permissions";

@Entity("roles")
export class Role {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "int", default: RoleLevel.MEMBER })
    level!: RoleLevel;

    @Column({ default: false })
    isSystem!: boolean; // System roles cannot be deleted

    @ManyToOne(() => Organization, (organization) => organization.roles, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization?: Organization;

    @Column({ nullable: true })
    @Index()
    organizationId?: string;

    @ManyToMany(() => Permission, (permission) => permission.roles)
    @JoinTable({
        name: "role_permissions",
        joinColumn: { name: "roleId", referencedColumnName: "id" },
        inverseJoinColumn: { name: "permissionId", referencedColumnName: "id" }
    })
    permissions!: Permission[];

    @OneToMany(() => User, (user) => user.role)
    users!: User[];

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
