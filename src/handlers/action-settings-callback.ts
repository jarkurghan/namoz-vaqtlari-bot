import { saveUser } from "../services/save-user";
import { makeMarks, MESSAGES } from "../services/make-keyboard";
import { CTX } from "../utils/types";
import { sendErrorLog } from "../services/log";

export async function registerSettingsCallback(ctx: CTX) {
    try {
        const [user] = await saveUser(ctx);

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
                const is_service_active = user.status === "active";
                await ctx.reply(MESSAGES.SETTINGS(user), await makeMarks({ key: "settings", lang, is_service_active }));
            }
        }
    } catch (error) {
        await sendErrorLog({ event: "Sozlamalar olishda", error, ctx });
    }
}
