import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const host = process.env.DB_HOST;
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

if (!host || !port || !user || !password || !database) {
    throw new Error("Database env variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) are not fully set");
}

export const sql = postgres({ host, port, username: user, password, database });
export const db = drizzle(sql);
