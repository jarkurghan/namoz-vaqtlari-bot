import type { CommandContext, Context } from "grammy";
import { makeDashboardReplyKeyboard } from "../services/make-reply-keyboard";
import { makeMarks, MESSAGES } from "../services/make-keyboard";
import { saveUser } from "../services/save-user";
import { User } from "../utils/types";
import { bot } from "../bot";

export async function registerStartCommand(ctx: CommandContext<Context>) {
    const payload = ctx.match;
    const utm = payload.slice(payload.indexOf("utm-") + 4);

    const [user]: User[] = await saveUser(ctx, { utm });

    if (!user.language) {
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            const options = { reply_markup: await makeDashboardReplyKeyboard(lang, Number(user.city)), parse_mode: "HTML" as const };
            await bot.api.sendMessage(user.tg_id, await MESSAGES.DASHBOARD(user), options);
        }
    }
}
