import type { BotError, Context } from "grammy";
import { sendLog } from "../services/log";

export async function registerErrorHandler(err: BotError<Context>) {
    const ctx = err.ctx;
    await sendLog(`Error while handling update ${ctx.update.update_id}:`);
    if (err.error instanceof Error) await sendLog(err.error.message);
}

