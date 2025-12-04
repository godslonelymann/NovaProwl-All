/**
 * server.ts
 * -------------
 * Entry point — starts the HTTP server.
 * 
 * - Loads environment variables
 * - Creates Express app from app.ts
 * - Starts listening on configured PORT
 */

// app/server.ts

import http from "http";
import app from "./app";
import { env } from "./utils/env"; // ✅ use the exported env object

const PORT = env.PORT || 8000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`NovaProwl backend running at http://localhost:${PORT}`);
});

// Optional: handle basic server errors
server.on("error", (err) => {
  console.error("Server error:", err);
});