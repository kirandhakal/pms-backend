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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === "development",
    logging: process.env.NODE_ENV === "development",
    entities: [User_1.User, Team_1.Team, Project_1.Project, Task_1.Task, Invitation_1.Invitation, Session_1.Session],
    migrations: [],
    subscribers: [],
});
