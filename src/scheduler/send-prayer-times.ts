import { bot } from "../bot";
import { sendLog } from "../log";
import { PrayerUser } from "../types";
import { UserTimeData } from "../types";
import { makeMessage } from "../services/make-message";
import { deactivator } from "../services/deactivator";
import { ptu, pt } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { db, sql } from "../db";

type PrayerTimeUserSelect = typeof ptu.$inferSelect;
type PrayerTimesSelect = typeof pt.$inferSelect;

function mapDbUsersToPrayerUsers(rows: PrayerTimeUserSelect[]): PrayerUser[] {
    return rows.map((row) => ({
        tg_id: row.tg_id ?? "",
        language: row.language ?? 0,
        city: String(row.city ?? ""),
        is_active: row.is_active ?? false,
        time: row.time ?? 0,
    }));
}

function mapDbPrayerTimesToUserTimeData(rows: PrayerTimesSelect[]): UserTimeData[] {
    return rows.map((row) => ({
        date_text_uz: row.date_text_uz,
        date_text_cyrl: row.date_text_cyrl,
        tong: row.tong,
        quyosh: row.quyosh,
        peshin: row.peshin,
        asr: row.asr,
        shom: row.shom,
        xufton: row.xufton,
        city: String(row.city),
    }));
}

export const sendPrayerTimes = async (): Promise<void> => {
    const hour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent", hour: "2-digit", hour12: false }));

    let userRows: PrayerTimeUserSelect[] = [];
    let timeRows: PrayerTimesSelect[] = [];

    try {
        userRows = await db
            .select()
            .from(ptu)
            .where(and(eq(ptu.time, hour), eq(ptu.is_active, true)));
    } catch (error) {
        const message = "❗️ prayer_time_users jadvalidan ma'lumot o'qib bo'lmadi: " + (error instanceof Error ? error.message : String(error));
        await sendLog(message);
        return;
    }

    try {
        timeRows = await db.select().from(pt);
    } catch (error) {
        const message = "❗️ prayer_times jadvalidan ma'lumot o'qib bo'lmadi: " + (error instanceof Error ? error.message : String(error));
        await sendLog(message);
        return;
    }

    const typedUsers = mapDbUsersToPrayerUsers(userRows);
    const typedTimes = mapDbPrayerTimesToUserTimeData(timeRows);

    let counter = 0;
    for (const user of typedUsers) {
        try {
            const userTime = typedTimes.find((e) => e.city === user.city);

            if (userTime) {
                const message = makeMessage(user.language, userTime);
                await bot.api.sendMessage(user.tg_id, message, { parse_mode: "HTML" });
                counter++;
            } else {
                await sendLog(`❗️ Yuborish vaqti topilmadi\n\n: ${JSON.stringify(user, null, 2)}`);
            }
        } catch (error: any) {
            const errorMsg = error.message || "";
            if (errorMsg.includes("bot was blocked by the user") || errorMsg.includes("user is deactivated")) {
                await deactivator(user.tg_id);
            } else {
                await sendLog(`❗️ Xabar yuborishda xato: ${errorMsg}`);
            }
        }
    }

    console.log(`✅ Namoz vaqtlari yuborildi\n\n🕐 Yuborishlar: ${counter}\n💣 Xato: ${typedUsers.length - counter}`);
    await sendLog(`✅ Namoz vaqtlari yuborildi\n\n🕐 Yuborishlar: ${counter}\n💣 Xato: ${typedUsers.length - counter}`);
};

async function main() {
    try {
        await sendPrayerTimes();
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
