import type { BotError, Context } from "grammy";
import { sendErrorLog } from "../services/log";

export async function registerErrorHandler(error: BotError<Context>) {
    const ctx = error.ctx;
    const event = `Bot global xatolik (${ctx.update.update_id})`;
    await sendErrorLog({ ctx, event, error });
}
