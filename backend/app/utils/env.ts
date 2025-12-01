import dotenv from "dotenv";

dotenv.config();

function getBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const env = {
  PORT: Number(process.env.PORT || 8000),
  NODE_ENV: process.env.NODE_ENV || "development",

  LLM_PROVIDER: (process.env.LLM_PROVIDER || "openai") as "openai" | "groq",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini",

  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",

  LOG_REQUESTS: getBool("LOG_REQUESTS", true),
};