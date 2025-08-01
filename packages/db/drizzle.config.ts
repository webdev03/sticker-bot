import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  extensionsFilters: ["postgis"], // idk why this extension is installed
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
