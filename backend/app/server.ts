/**
 * server.ts
 * -------------
 * Entry point — starts the HTTP server.
 * 
 * - Loads environment variables
 * - Creates Express app from app.ts
 * - Starts listening on configured PORT
 */

import http from "http";
import app from "./app";
import { loadEnv } from "./utils/env";

const env = loadEnv();

const PORT = env.PORT || 8000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 NovaProwl backend running at http://localhost:${PORT}`);
});