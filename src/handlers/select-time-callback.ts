import type { CallbackQueryContext, Context } from "grammy";
import { makeMarks, MESSAGES } from "../services/make-keyboard";
import { makeDashboardReplyKeyboard } from "../services/make-reply-keyboard";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { saveUser } from "../services/save-user";
import { Status } from "../utils/types";
import { ptu } from "../db/schema";
import { bot } from "../bot";
import { db } from "../db";

export async function registerTimeCallback(ctx: CallbackQueryContext<Context>) {
    const time = ctx.callbackQuery.data.split("_")[1];

    const tg_id = ctx.from.id;
    const [userStatus] = await db
        .select()
        .from(ptu)
        .where(eq(ptu.tg_id, String(tg_id)))
        .limit(1);

    const { language, city } = userStatus;

    const [user] = await saveUser(ctx, { language, city, time, status: userStatus?.status as Status });

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

    if (user.language) {
        const hourStr = user.time !== undefined && user.time !== null ? String(user.time).padStart(2, "0") : "00";
        const hour = hourStr + ":00";
        await ctx.answerCallbackQuery({ text: user.language == 2 ? `Vaqt tanlandi: ${hour}` : `Вақт танланди: ${hour}` });
    }
}
