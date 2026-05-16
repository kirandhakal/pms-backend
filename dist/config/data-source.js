"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const Team_1 = require("../entities/Team");
const Project_1 = require("../entities/Project");
const Task_1 = require("../entities/Task");
const Invitation_1 = require("../entities/Invitation");
const Session_1 = require("../entities/Session");
const Organization_1 = require("../entities/Organization");
const Department_1 = require("../entities/Department");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
const Workflow_1 = require("../entities/Workflow");
const WorkflowStage_1 = require("../entities/WorkflowStage");
const AuditLog_1 = require("../entities/AuditLog");
const TaskActivity_1 = require("../entities/TaskActivity");
const TaskComment_1 = require("../entities/TaskComment");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL;
const databaseHost = process.env.DATABASE_HOST || process.env.DB_HOST || "localhost";
const databasePort = Number(process.env.DATABASE_PORT || process.env.DB_PORT || 5432);
const databaseUsername = process.env.DATABASE_USERNAME || process.env.DB_USERNAME || process.env.DB_USER || "postgres";
const databasePassword = String(process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || "");
const databaseName = process.env.DATABASE_NAME || process.env.DB_NAME || "postgres";
exports.AppDataSource = new typeorm_1.DataSource({
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
    entities: [
        User_1.User,
        Team_1.Team,
        Project_1.Project,
        Task_1.Task,
        Invitation_1.Invitation,
        Session_1.Session,
        Organization_1.Organization,
        Department_1.Department,
        Role_1.Role,
        Permission_1.Permission,
        Workflow_1.Workflow,
        WorkflowStage_1.WorkflowStage,
        AuditLog_1.AuditLog,
        TaskActivity_1.TaskActivity,
        TaskComment_1.TaskComment
    ],
    migrations: [],
    subscribers: [],
});
