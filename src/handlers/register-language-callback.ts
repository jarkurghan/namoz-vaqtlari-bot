import type { CallbackQueryContext, Context } from "grammy";
import { saveUser } from "../services/save-user";
import { makeMarks, MESSAGES } from "../services/make-keyboard";

export async function registerLanguageCallback(ctx: CallbackQueryContext<Context>) {
    const [user] = await saveUser(ctx);
    const lang = Number(user.language) === 2 ? 2 : 1;
    await ctx.deleteMessage().catch((err) => console.log(err));
    await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang", lang }));
}

