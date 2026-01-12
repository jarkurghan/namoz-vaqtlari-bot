import { Hono } from "hono";
import { handle } from "hono/vercel";
import { handleUpdate } from "./bot";

const app = new Hono();

app.post("/bot", async (c) => await handleUpdate(c));
app.get("/", (c) => c.text("Hello Hono!"));

export const config = { runtime: "edge" };
export const POST = handle(app);
export const GET = handle(app);
