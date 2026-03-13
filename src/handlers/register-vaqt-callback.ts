import type { CallbackQueryContext, Context } from "grammy";
import { saveUser } from "../services/save-user";
import { makeMarks, MESSAGES } from "../services/make-keyboard";

export async function registerVaqtCallback(ctx: CallbackQueryContext<Context>) {
    const [user] = await saveUser(ctx);
    const lang = Number(user.language) === 2 ? 2 : 1;
    await ctx.deleteMessage().catch((err) => console.log(err));
    await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang, is_back: Boolean(user.time) }));
}

