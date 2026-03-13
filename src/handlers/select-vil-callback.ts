import type { CallbackQueryContext, Context } from "grammy";
import { saveUser } from "../services/save-user";
import { makeMarks, MESSAGES } from "../services/make-keyboard";

export async function registerVilCallback(ctx: CallbackQueryContext<Context>) {
    const vil_code = ctx.callbackQuery.data.split("_")[1];

    const [user] = await saveUser(ctx);

    if (!user.language) {
        await ctx.deleteMessage().catch((err) => console.log(err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;
        await ctx.deleteMessage().catch((err) => console.log(err));
        await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "reg", lang, vil: Number(vil_code) }));
    }
}

