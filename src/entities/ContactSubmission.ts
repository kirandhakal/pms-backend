import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum ContactStatus {
  NEW = "NEW",
  READ = "READ",
  RESOLVED = "RESOLVED",
}

@Entity("contact_submissions")
export class ContactSubmission {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 120 }) name!: string;
  @Column({ length: 180 }) email!: string;
  @Column({ length: 160 }) subject!: string;
  @Column({ type: "text" }) message!: string;
  @Column({ type: "enum", enum: ContactStatus, default: ContactStatus.NEW }) status!: ContactStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
