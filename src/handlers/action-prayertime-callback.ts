import { eq } from "drizzle-orm/sql/expressions/conditions";
import { saveUser } from "../services/save-user";
import { makeMarks, MESSAGES } from "../services/make-keyboard";
import { CTX, mapDbPrayerTimeToUserTimeData } from "../utils/types";
import { makeMessage } from "../services/make-message";
import { sendErrorLog, sendLog } from "../services/log";
import { pt } from "../db/schema";
import { db } from "../db";

export async function registerPrayertimeCallback(ctx: CTX) {
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
                const whereCondition = eq(pt.city, Number(user.city));
                const rows = await db.select().from(pt).where(whereCondition).limit(1);
                const prayerTimeRow = rows[0];

                if (!prayerTimeRow) {
                    await sendLog(`❗️ prayer_times jadvalidan ma'lumot topilmadi\n\n${JSON.stringify(user, null, 2)}`);
                    await ctx.answerCallbackQuery({ text: lang === 2 ? "Ma'lumot topilmadi" : "Маълумот топилмади", show_alert: true });
                    return;
                }

                const message = makeMessage(lang, mapDbPrayerTimeToUserTimeData(prayerTimeRow));
                await ctx.reply(message, { parse_mode: "HTML" });
            }
        }
    } catch (error) {
        await sendErrorLog({ event: "Namoz vaqtlari olishni bosganda", error, ctx });
    }
}
