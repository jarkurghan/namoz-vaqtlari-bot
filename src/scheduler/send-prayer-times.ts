import { bot } from "../bot";
import { sendLog } from "../log";
import { PrayerUser } from "../types";
import { UserTimeData } from "../types";
import { ptu, pt } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

type PrayerTimeUserSelect = typeof ptu.$inferSelect;
type PrayerTimesSelect = typeof pt.$inferSelect;

export const makeMessage = (language: number, userTime: UserTimeData): string => {
    const isLatn = language == 2;
    const isRamadan = userTime.date_text_uz.includes("Ramazon");

    const dateText = `${isLatn ? userTime.date_text_uz : userTime.date_text_cyrl}\n\n`;
    const fajrText = isRamadan
        ? `${isLatn ? "Tong (Saharlik)" : "Тонг (Саҳарлик)"}: <b>${userTime.tong}</b>\n`
        : `${isLatn ? "Tong" : "Тонг"}: <b>${userTime.tong}</b>\n`;
    const sunriseText = `${isLatn ? "Quyosh" : "Қуёш"}: <b>${userTime.quyosh}</b>\n`;
    const dhuhrText = `${isLatn ? "Pеshin" : "Пешин"}: <b>${userTime.peshin}</b>\n`;
    const asrText = `${isLatn ? "Asr" : "Аср"}: <b>${userTime.asr}</b>\n`;
    const maghribText = isRamadan
        ? `${isLatn ? "Shom (Iftor)" : "Шом (Ифтор)"}: <b>${userTime.shom}</b>\n`
        : `${isLatn ? "Shom" : "Шом"}: <b>${userTime.shom}</b>\n`;
    const ishaText = `${isLatn ? "Xufton" : "Хуфтон"}: <b>${userTime.xufton}</b>`;
    const duaText = isRamadan
        ? isLatn
            ? `<i>\n\nSaharlik duosi:\n` +
              `«Navaytu an asuma savma shahri Ramazona minal fajri ilal mag‘ribi, xolisan lillahi ta'ala. Allohu akbar»` +
              `\n\nOg‘iz ochish duosi:\n` +
              `«Allohumma laka sumtu va bika amantu va 'alayka tavakkaltu va 'ala rizqika aftortu. ` +
              `Fag‘fir li ya G‘offaru ma qoddamtu va ma axxortu».</i>`
            : `<i>\n\nСаҳарлик дуоси:\n` +
              `«Навайту ан асума совма шаҳри рамазона минал фажри илал мағриби, холисан лиллаҳи таъала Аллоҳу акбар».` +
              `\n\nОғиз очиш дуоси:\n` +
              `«Аллоҳумма лака сумту ва бика аманту ва ъалайка таваккалту ва ъалаа ризқика афторту. ` +
              `Фағфирли Я Ғоффару ма қоддамту ва ма аххорту».</i>`
        : "";

    return dateText + fajrText + sunriseText + dhuhrText + asrText + maghribText + ishaText + duaText;
};

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

export async function deactivator(tg_id: number | string): Promise<void> {
    try {
        const updated = await db
            .update(ptu)
            .set({ is_active: false })
            .where(eq(ptu.tg_id, String(tg_id)))
            .returning();

        if (!updated.length) {
            await sendLog(`❗️ Xizmatni o'chirib bo'lmadi (foydalanuvchi topilmadi):\n\n👤 User ID: ${tg_id}`);
        } else {
            await sendLog(`⚰️ Foydalanuvchi ${tg_id} uchun xizmat o'chirildi`);
        }
    } catch (error) {
        const errorMsg = `❗️ Xizmatni o'chirish jarayonida xatolik yuz berdi:\n\n👤 User ID: ${tg_id}\n💣 Xato: `;
        if (error instanceof Error) {
            await sendLog(`${errorMsg}${error.message}`);
        } else {
            await sendLog(`${errorMsg}${error}`);
        }
    }
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

    await sendLog(`✅ Namoz vaqtlari yuborildi\n\n🕐 Yuborishlar: ${counter}\n💣 Xato: ${typedUsers.length - counter}`);
};

sendPrayerTimes();
