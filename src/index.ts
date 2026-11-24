import "reflect-metadata";
import { createServer } from "http";
import { attachChat } from "./realtime/chat";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { AppDataSource } from "./config/data-source";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health/ready", async (_req, res) => {
    try {
        await AppDataSource.query("SELECT 1");
        res.status(200).json({ status: "ready" });
    } catch {
        res.status(503).json({ status: "unavailable" });
    }
});

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
        const server = createServer(app);
        attachChat(server);
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Error during Data Source initialization", err);
        process.exitCode = 1;
    });
