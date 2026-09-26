import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit reads DATABASE_URL from the environment.
    // Never commit a real URL; see .env.example.
    url: process.env["DATABASE_URL"] ?? "",
  },
} satisfies Config;
