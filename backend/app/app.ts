import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { requestIdMiddleware } from "./middleware/requestId";
import { notFoundMiddleware } from "./middleware/notFound";
import { errorHandlerMiddleware } from "./middleware/errorHandler";
import { env } from "./utils/env";

const app = express();

// Core middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.LOG_REQUESTS) {
  app.use(morgan("dev"));
}

// Attach request-id for tracing
app.use(requestIdMiddleware);

// Routes
app.use("/", routes);

// 404 + error handler
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;