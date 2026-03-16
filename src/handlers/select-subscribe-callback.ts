import type { CallbackQueryContext, Context } from "grammy";
import { makeMarks, MESSAGES } from "../services/make-keyboard";
import { saveUser } from "../services/save-user";

export async function registerSubscribeCallback(ctx: CallbackQueryContext<Context>) {
    const is_service_active = ctx.callbackQuery.data.split("_")[1] === "true";

    const [user] = await saveUser(ctx, { status: is_service_active ? "active" : "inactive" });

    const lang = Number(user.language) === 2 ? 2 : 1;
    if (!user.language) {
        await ctx.deleteMessage().catch((err) => console.log(err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        if (!user.city) {
            await ctx.deleteMessage().catch((err) => console.log(err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch((err) => console.log(err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch((err) => console.log(err));
            await ctx.reply(MESSAGES.SETTINGS(user), await makeMarks({ key: "settings", lang, is_service_active: user.status === "active" }));
        }
    }

    const text = lang === 2 ? (is_service_active ? "Obuna tiklandi" : "Obuna to'xtatildi") : is_service_active ? "Обуна тикланди" : "Обуна тўхтатилди";
    await ctx.answerCallbackQuery({ text });
}
