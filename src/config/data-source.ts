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

const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();

const databaseUrl = process.env.DATABASE_URL;

const databaseHost = process.env.DATABASE_HOST || process.env.DB_HOST || "localhost";
const databasePort = Number(process.env.DATABASE_PORT || process.env.DB_PORT || 5432);
const databaseUsername = process.env.DATABASE_USERNAME || process.env.DB_USERNAME || process.env.DB_USER || "postgres";
const databasePassword = String(process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || "");
const databaseName = process.env.DATABASE_NAME || process.env.DB_NAME || "postgres";

export const AppDataSource = new DataSource({
    type: "postgres",
    ...(databaseUrl
        ? { url: databaseUrl }
        : {
            host: databaseHost,
            port: databasePort,
            username: databaseUsername,
            password: databasePassword,
            database: databaseName
        }),
    synchronize: nodeEnv === "development",
    logging: nodeEnv === "development",
    entities: [User, Team, Project, Task, Invitation, Session],
    migrations: [],
    subscribers: [],
});
