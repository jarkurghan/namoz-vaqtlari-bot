import { CallbackQueryContext, Context } from "grammy";
import { makeMarks, MESSAGES } from "../services/make-keyboard";
import { makeDashboardReplyKeyboard } from "../services/make-reply-keyboard";
import { saveUser } from "../services/save-user";
import { bot } from "../bot";

export async function registerLangCallback(ctx: CallbackQueryContext<Context>) {
    const language = ctx.callbackQuery.data.split("_")[1];

    const [user] = await saveUser(ctx, { language });

    if (!user.language) {
        await ctx.deleteMessage().catch((err) => console.log(err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch((err) => console.log(err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch((err) => console.log(err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch((err) => console.log(err));
            const options = { reply_markup: await makeDashboardReplyKeyboard(lang, Number(user.city)), parse_mode: "HTML" as const };
            await bot.api.sendMessage(user.tg_id, await MESSAGES.DASHBOARD(user), options);
        }
    }

    await ctx.answerCallbackQuery({ text: language === "2" ? "Lotincha tanlandi" : "Кириллча танланди" });
}
