import { Hono } from "hono";
import { handleUpdate } from "./bot";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.post("/bot", async (c) => await handleUpdate(c));
app.get("/", (c) => c.text("Hello Hono!"));

export default app;

// import { startBot } from "./bot";

// startBot();
