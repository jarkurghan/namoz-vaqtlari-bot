import { bot } from "../bot";
import { db, sql } from "../db";
import { ptu } from "../db/schema";
import { sendLog } from "../services/log";
import { mapDbUserToUser } from "../utils/types";
import { PrayerTimeUserSelect } from "../utils/types";
import { getBroadcastMessage } from "../services/make-reply-keyboard";
import { makeDashboardReplyKeyboard } from "../services/make-reply-keyboard";
import { deactivator } from "../services/deactivator";
import { GrammyError, InputFile } from "grammy";
import { ADMIN_ID } from "../utils/constants";

export const sendToAllUsers = async (): Promise<void> => {
    let rows: PrayerTimeUserSelect[] = [];

    try {
        rows = await db.select().from(ptu);
    } catch (error) {
        const message = "❗️ prayer_time_users jadvalidan ma'lumot o'qib bo'lmadi: " + (error instanceof Error ? error.message : String(error));
        await sendLog(message);
        return;
    }

    const users = rows.map(mapDbUserToUser);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
        if (user.tg_id != ADMIN_ID) continue;
        try {
            const lang = Number(user.language) === 1 ? 1 : 2;
            const message = getBroadcastMessage(lang);
            const replyMarkup = await makeDashboardReplyKeyboard(lang, user.city);
            const photo = new InputFile("src/utils/image-01-send-to-all-users.png");
            await bot.api.sendPhoto(user.tg_id, photo, { caption: message, reply_markup: replyMarkup, parse_mode: "HTML" });

            await new Promise((resolve) => setTimeout(resolve, 200));

            sent++;
        } catch (error) {
            failed++;

            if (error instanceof GrammyError) {
                const description = error.description || "";

                if (description.includes("bot was blocked by the user") || description.includes("user is deactivated")) {
                    await sendLog(`Foydalanuvchi botni bloklagan (${user.tg_id}): \n${description}`);
                    await deactivator(user.tg_id);
                } else {
                    await sendLog(`Xabar yuborishda xatolik (${user.tg_id}): \n${description}`);
                }
            } else if (error instanceof Error) {
                await sendLog(`Xabar yuborishda xatolik (${user.tg_id}): \n${error.message}`);
            } else {
                await sendLog(`Xabar yuborishda xatolik (${user.tg_id}): \n${String(error)}`);
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
