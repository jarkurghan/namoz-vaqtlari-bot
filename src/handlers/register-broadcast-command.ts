import type { CommandContext, Context } from "grammy";
import { GrammyError, InlineKeyboard } from "grammy";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { changeStatus, deactivator } from "../services/deactivator";
import { sendLog } from "../services/log";
import { PrayerTimeUserSelect, mapDbUserToUser } from "../utils/types";
import { ADMIN_ID, LOG_CHAT } from "../utils/constants";
import { ptu } from "../db/schema";
import { db } from "../db";
import { userLink } from "../services/save-user";

export async function registerBroadcastCommand(ctx: CommandContext<Context>) {
    if (String(ctx.chat.id) !== ADMIN_ID) {
        void ctx.api.sendMessage(LOG_CHAT, "No broadcast: " + ctx.chat.id);
        return;
    }

    void (async () => {
        const msg = await ctx.api.sendMessage(LOG_CHAT, "Broadcast...");
        await ctx.reply(`Broadcast started: https://t.me/c/${LOG_CHAT.slice(4)}/${msg.message_id}`);

        let users: PrayerTimeUserSelect[] = [];
        try {
            users = await db.select().from(ptu).where(eq(ptu.status, "new"));
        } catch (error) {
            const message = "❗️ prayer_time_users jadvalidan ma'lumot o'qib bo'lmadi: " + (error instanceof Error ? error.message : String(error));
            await sendLog(message, { reply_to_message_id: msg.message_id });
            return;
        }

        const scs = [];
        const ers = [];
        let counter = 0;
        const data = users.map(mapDbUserToUser);
        for (let i = 0; i < data.length; i++) {
            if (!data[i].time || !data[i].city || !data[i].language) {
                try {
                    counter++;
                    const lang = Number(data[i].language);
                    const message =
                        lang === 1
                            ? "Ассалом алайкум! Ботдан тўлиқ фойдаланиш учун" +
                              `${data[i].language ? "" : " тил,"}` +
                              `${data[i].city ? "" : " ҳудуд, ва"}` +
                              `${data[i].time ? "" : " тарқатма вақти"}` +
                              "ни танлашингизни сўраймиз\n\n" +
                              `${data[i].language ? "" : "<b>тил</b> - мулоқот учун\n"}` +
                              `${data[i].city ? "" : "<b>ҳудуд</b> - қайси ҳудуд учун намоз вақтларини олиш\n"}` +
                              `${data[i].time ? "" : "<b>тарқатма вақти</b> - намоз вақтларини қайси вақтда олиш\n"}`
                            : "Assalom alaykum! Botdan to'liq foydalanish uchun" +
                              `${data[i].language ? "" : " til,"}` +
                              `${data[i].city ? "" : " hudud, va"}` +
                              `${data[i].time ? "" : " tarqatma vaqti"}` +
                              "ni tanlashingizni so'raymiz\n\n" +
                              `${data[i].language ? "" : "<b>til</b> - muloqot uchun\n"}` +
                              `${data[i].city ? "" : "<b>hudud</b> - qaysi hudud uchun namoz vaqtlarini olish\n"}` +
                              `${data[i].time ? "" : "<b>tarqatma vaqti</b> - namoz vaqtlarini qaysi vaqtda olish\n"}`;

                    const langText = lang === 1 ? "Тилни танлаш" : "Tilni tanlash";
                    const regionText = lang === 1 ? "Ҳудудни танлаш" : "Hududni tanlash";
                    const timeText = lang === 1 ? "Тарқатма вақтини танлаш" : "Tarqatma vaqtini tanlash";

                    const keyboard = new InlineKeyboard();
                    if (!data[i].language) keyboard.text(langText, `language`).row();
                    else if (!data[i].city) keyboard.text(regionText, `vils`).row();
                    else if (!data[i].time) keyboard.text(timeText, `vaqt`).row();

                    await ctx.api.sendMessage(data[i].tg_id, message, { reply_markup: keyboard, parse_mode: "HTML" });

                    await new Promise((resolve) => setTimeout(resolve, 40));
                    scs.push(data[i].tg_id);
                } catch (error) {
                    ers.push(data[i].tg_id);

                    if (error instanceof GrammyError && error.description.includes("bot was blocked by the user")) {
                        await sendLog(`Foydalanuvchi ${userLink(data[i])} botni bloklagan.`, { reply_to_message_id: msg.message_id });
                        await deactivator(data[i].tg_id);
                        await changeStatus(data[i].tg_id, "has_blocked");
                    } else if (error instanceof GrammyError && error.description.includes("user is deactivated")) {
                        await sendLog(`Foydalanuvchi ${userLink(data[i])} deleted account qilgan.`, { reply_to_message_id: msg.message_id });
                        await deactivator(data[i].tg_id);
                        await changeStatus(data[i].tg_id, "deleted_account");
                    } else if (error instanceof Error) {
                        await sendLog(`Xatolik yuz berdi (${userLink(data[i])}): \n${error.message}`, { reply_to_message_id: msg.message_id });
                    } else {
                        await sendLog(`Xatolik yuz berdi (${userLink(data[i])}): \n${error}`, { reply_to_message_id: msg.message_id });
                    }
                }
            }
        }

        const message = `✅ Sozlamalar bildirishnomalari yuborildi\n\n🎯 Yuborildi: ${scs.length}\n💣 Xato: ${ers.length}\n🏆 Jami: ${counter}`;
        await sendLog(message, { reply_to_message_id: msg.message_id });
    })().catch(async (error) => {
        if (error instanceof Error) {
            await sendLog(`Broadcast umumiy xatolik: ${error.message}`);
        } else {
            await sendLog(`Broadcast umumiy xatolik: ${String(error)}`);
        }
    });
}
