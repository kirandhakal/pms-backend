import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Team } from "../entities/Team";
import { Project } from "../entities/Project";
import { Task } from "../entities/Task";
import { Invitation } from "../entities/Invitation";
import { Session } from "../entities/Session";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === "development",
    logging: process.env.NODE_ENV === "development",
    entities: [User, Team, Project, Task, Invitation, Session],
    migrations: [],
    subscribers: [],
});
