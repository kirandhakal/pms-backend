import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { UserRole } from "./User";
import { Project } from "./Project";

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
        default: UserRole.USER
    })
    role!: UserRole;

    @ManyToOne(() => Project, { nullable: true })
    project?: Project;

    @Column({ type: "timestamp" })
    expiresAt!: Date;

    @Column({ default: false })
    isUsed!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
