import { bot } from "../bot";
import { db, sql } from "../db";
import { pt, ptu } from "../db/schema";
import { sendLog } from "../services/log";
import { mapDbUserToUser } from "../utils/types";
import { PrayerTimeUserSelect } from "../utils/types";
import { broadcastMessageQadrKechasi } from "../services/make-reply-keyboard";
import { makeDashboardReplyKeyboard } from "../services/make-reply-keyboard";
import { changeStatus } from "../services/deactivator";
import { userLink } from "../services/save-user";
import { GrammyError } from "grammy";

export const sendToAllUsers = async (): Promise<void> => {
    let rows: PrayerTimeUserSelect[] = [];
    let activeCities: number[] = [];

    try {
        rows = await db.select().from(ptu);
    } catch (error) {
        const message = "❗️ prayer_time_users jadvalidan ma'lumot o'qib bo'lmadi: " + (error instanceof Error ? error.message : String(error));
        await sendLog(message);
        return;
    }

    try {
        const currentTimestamp = new Date().getTime();
        const cities = await db.select({ city: pt.city, updated_date: pt.updated_date }).from(pt);
        activeCities = [...new Set(cities.filter((e) => 86400000 > currentTimestamp - new Date(e.updated_date).getTime()).map((e) => e.city))];
    } catch (error) {
        const message = "❗️ prayer_times jadvalidan ma'lumot o'qib bo'lmadi: " + (error instanceof Error ? error.message : String(error));
        await sendLog(message);
        return;
    }

    const users = rows.map(mapDbUserToUser);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
        if (user.status === "has_blocked" || user.status === "deleted_account") continue;
        try {
            const lang = Number(user.language) === 1 ? 1 : 2;
            const message = broadcastMessageQadrKechasi(lang);
            const replyMarkup = await makeDashboardReplyKeyboard(lang, user.city, activeCities);
            await bot.api.sendMessage(user.tg_id, message, { reply_markup: replyMarkup, parse_mode: "HTML" });
            sent++;
        } catch (error) {
            failed++;

            if (error instanceof GrammyError) {
                const description = error.description || "";

                if (description.includes("bot was blocked by the user")) {
                    await sendLog(`Foydalanuvchi botni bloklagan (${userLink(user)}): \n${description}`);
                    await changeStatus(user.tg_id, "has_blocked");
                } else if (description.includes("user is deactivated")) {
                    await sendLog(`O'chirilgan hisob (${userLink(user)}): \n${description}`);
                    await changeStatus(user.tg_id, "deleted_account");
                } else {
                    await sendLog(`Xabar yuborishda xatolik (${userLink(user)}): \n${description}`);
                    await changeStatus(user.tg_id, "other");
                }
            } else if (error instanceof Error) {
                await sendLog(`Xabar yuborishda xatolik (${userLink(user)}): \n${error.message}`);
            } else {
                await sendLog(`Xabar yuborishda xatolik (${userLink(user)}): \n${String(error)}`);
            }
        }
    }

    const summary = `✅ Reply keyboard yangiligi yuborildi\n\n🎯 Yuborildi: ${sent}\n💣 Xato: ${failed}\n🏆 Jami: ${sent + failed}`;
    console.log(summary);
    await sendLog(summary);
};

async function main() {
    try {
        await sendToAllUsers();
        await sql.end({ timeout: 5 });
    } catch (err) {
        console.error(err);
        try {
            await sql.end({ timeout: 5 });
        } finally {
            process.exit(1);
        }
    }
}

main();
