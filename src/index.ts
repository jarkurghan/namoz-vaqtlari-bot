import { Hono } from "hono";
import { handleUpdate } from "./bot";

const app = new Hono();

app.post("/bot", async (c) => await handleUpdate(c));
app.get("/", (c) => c.text("Hello Hono!"));

export default app;
