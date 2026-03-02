import { Bot } from "grammy";
import { CTX } from "./types";
import { User } from "./types";
import { SaveUserData } from "./types";
import { deactivateService } from "./send";
import { makeMessage } from "./send";
import { ADMIN_ID } from "./constants";
import { LOG_CHAT } from "./constants";
import { BOT_TOKEN } from "./constants";
import { ADMIN_CHAT } from "./constants";
import { supabase } from "./supabase";
import { GrammyError } from "grammy";
import { InlineKeyboard } from "grammy";
import { webhookCallback } from "grammy";
import { paramsTypeOfMakeMarks } from "./types";
import { ParseMode } from "@grammyjs/types/message";
import { dontDelete } from "./log";
import { sendLog } from "./log";
import regions from "./cities.json";

if (!BOT_TOKEN) throw new Error("BOT_TOKEN topilmadi!");

export const bot = new Bot(BOT_TOKEN);

export const MAINTENANCE_MESSAGE =
    "⏳ islom.uz saytidagi texnik o'zgarishlar sabab bot bir necha kun ishlamayi." +
    "\n\nislom.uz сайтидаги техник ўзгаришлар сабаб бот бир неча кун ишламайди.";

bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== "private") return;
    await next();
});

bot.use(async (ctx) => {
    await ctx.reply(MAINTENANCE_MESSAGE);
});

async function saveUser(ctx: CTX, data?: SaveUserData): Promise<User[]> {
    const user = ctx.from;
    if (!user) return [];

    const userData: User = {
        tg_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
    };

    if (data && data.language) userData.language = data.language;
    if (data && data.city) userData.city = data.city;
    if (data && (typeof data.time === "number" || typeof data.time === "string")) userData.time = data.time;
    if (data && typeof data.is_active === "boolean") userData.is_active = data.is_active;

    try {
        const { data: existingUser } = await supabase.from("prayer_time_users").select("tg_id").eq("tg_id", userData.tg_id).maybeSingle();

        if (!existingUser) {
            const utm = data?.utm || "-";
            await bot.api.sendMessage(
                ADMIN_CHAT,
                `🆕 Yangi foydalanuvchi:\n\n` +
                    `👤 Ism: ${user.first_name || "Noma'lum"} ${user.last_name || ""}\n` +
                    `🔗 Username: ${user.username ? `@${user.username}` : "Noma'lum"}\n` +
                    `🆔 ID: ${user.id}\n` +
                    `🚪 Source: ${utm}\n` +
                    `🤖 Bot: @bugungi_namoz_bot`,
            );
        }

        const { data: upsertedData, error } = await supabase.from("prayer_time_users").upsert(userData, { onConflict: "tg_id" }).select("*");

        if (error) console.error("Supabasega saqlashda xato:", error);

        return (upsertedData as User[]) || [];
    } catch (error) {
        if (error instanceof Error) {
            await sendLog(`User create qilib bo'lmadi (${user.id}): \n${error.message}`);
        } else {
            await sendLog(`User create qilib bo'lmadi (${user.id}): \n${error}`);
        }
        return [];
    }
}

export const isActiveCity = async (city: number): Promise<boolean> => {
    const currentTimestamp = new Date().getTime();

    const { data, error } = await supabase.from("prayer_times").select("updated_date").eq("city", city);
    if (error) {
        console.error(error);
        return false;
    }

    const cityTimestamp = new Date(data[0].updated_date).getTime();

    return 86400000 > currentTimestamp - cityTimestamp;
};

function getTimeKeyboard(lang: number, is_back?: boolean) {
    const keyboard = new InlineKeyboard();

    for (let i = 1; i < 24; i++) {
        const hour = i.toString().padStart(2, "0");
        keyboard.text(`${hour}:00`, `time_${hour}`);
        if (i % 4 === 0) keyboard.row();
    }

    keyboard.row();
    if (is_back) keyboard.text(lang === 2 ? "Ortga qaytish" : "Ортга қайтиш", `settings`).row();

    return keyboard;
}

function getVilsKeyboard(lang: number, is_back?: boolean) {
    const keyboard = new InlineKeyboard();
    const key = ("viloyat_" + lang) as "viloyat_1" | "viloyat_2";

    const viloyatlarMap = new Map<string, { [key]: string; viloyat_code: string }>();
    regions.forEach((item) => {
        if (!viloyatlarMap.has(item.viloyat_code)) {
            viloyatlarMap.set(item.viloyat_code, { [key]: item[key], viloyat_code: item.viloyat_code });
        }
    });
    const vil = Array.from(viloyatlarMap.values());

    for (let i = 0; i < vil.length; i++) {
        const button = keyboard.text(vil[i][key], `vil_${vil[i].viloyat_code}`);
        if (i % 2 !== 0 || i === vil.length - 1) button.row();
    }

    const backText = lang === 2 ? "Ortga qaytish" : "Ортга қайтиш";
    if (is_back) keyboard.text(backText, `settings`).row();

    return keyboard;
}

function getRegsKeyboard(lang: number, vil_code: number) {
    const keyboard = new InlineKeyboard();
    const key = lang === 2 ? "name_2" : "name_1";
    const regs = [...new Set(regions.filter((item) => item.viloyat_code === String(vil_code)))];

    for (let i = 0; i < regs.length; i++) {
        const button = keyboard.text(regs[i][key], `reg_${regs[i].id}`);
        if (i % 2 !== 0 || i === regs.length - 1) button.row();
    }

    const backText = lang === 2 ? "Ortga qaytish" : "Ортга қайтиш";
    keyboard.text(backText, `vils`).row();

    return keyboard;
}

function getSettingsKeyboard(lang: number, is_active: boolean) {
    const langText = lang === 1 ? "Тилни ўзгартириш" : "Tilni o'zgartirish";
    const regionText = lang === 1 ? "Ҳудудни ўзгартириш" : "Hududni o'zgartirish";
    const timeText = lang === 1 ? "Юбориш вақтини ўзгартириш" : "Yuborish vaqtini o'zgartirish";
    const subText = lang === 1 ? (is_active ? "Обунани тўхтатиш" : "Обунани тиклаш") : is_active ? "Obunani toʻxtatish" : "Obunani tiklash";

    const keyboard = new InlineKeyboard();
    keyboard.text(langText, `language`).row();
    keyboard.text(regionText, `vils`).row();
    keyboard.text(timeText, `vaqt`).row();
    keyboard.text(subText, `subscribe_${!is_active}`).row();
    keyboard.text(lang === 2 ? "Ortga qaytish" : "Ортга қайтиш", `dashboard`).row();

    return keyboard;
}

async function getDashboardKeyboard(lang: number, city: number) {
    const keyboard = new InlineKeyboard();
    if (await isActiveCity(city)) keyboard.text(lang === 1 ? "Бугунги намоз вақтлари" : "Bugungi namoz vaqtlari", `prayertime`).row();
    keyboard.text(lang === 1 ? "⚙️ Созламалар" : "⚙️ Sozlamalar", `settings`).row();

    return keyboard;
}

async function getDashboardMessage(user: User) {
    const city = regions.find((e) => e.id == user.city) as { id: string; name_1: string; name_2: string };
    const hour = (user.time as number).toString().padStart(2, "0");
    const is_active_city = await isActiveCity(Number(city.id));

    return user.language === 2
        ? `${is_active_city ? "Har kuni" : "Ertadan boshlab har kuni"}` +
              ` soat <b>${hour}:00</b>da sizga ${city.name_2} vaqti bo‘yicha kunlik namoz vaqtlari yuboriladi.` +
              `${user.is_active ? "" : "\n\nEslatma: Siz hozirda obunani toʻxtatgansiz, namoz vaqtlari yuborilmaydi."}`
        : `${is_active_city ? "Ҳар куни" : "Эртадан бошлаб ҳар куни"}` +
              ` соат <b>${hour}:00</b>да сизга ${city.name_1} вақти бўйича кунлик намоз вақтлари юборилади.` +
              `${user.is_active ? "" : "\n\nЭслатма: Сиз ҳозирда обунани тўхтатгансиз, намоз вақтлари юборилмайди."}`;
}

function getSettingsMessage(user: User) {
    const city = regions.find((e) => e.id == user.city) as { id: string; name_1: string; name_2: string };
    const hour = (user.time as number).toString().padStart(2, "0");

    return user.language === 2
        ? `Hozirgi sozlamalar:\n\n` +
              "Til: 🇺🇿 Oʻzbekcha\n" +
              `Hudud: ${city.name_2}\n` +
              `Tarqatma vaqti: ${hour}:00` +
              `${user.is_active ? "" : "\nTarqatma holati: O'chirilgan"}`
        : "Ҳозирги созламалар:\n\n" +
              "Тил: 🇺🇿 Ўзбекча\n" +
              `Ҳудуд: ${city.name_1}\n` +
              `Тарқатма вақти: ${hour}:00` +
              `${user.is_active ? "" : "\nТарқатма ҳолати: Ўчирилган"}`;
}

const MESSAGES = {
    SELECT_LANG: {
        2: "Iltimos, tilni tanlang!\nИлтимос, тилни танланг:",
        1: "Iltimos, tilni tanlang!\nИлтимос, тилни танланг:",
    },
    SELECT_TIME: {
        2: "Kunlik namoz vaqtlari qaysi vaqtda yuborilishini xohlaysiz?",
        1: "Кунлик намоз вақтлари қайси вақтда юборилишини хоҳлайсиз?",
    },
    SELECT_REGION: {
        2: "Hududni tanlang",
        1: "Ҳудудни танланг",
    },
    SETTINGS: getSettingsMessage,
    DASHBOARD: getDashboardMessage,
};

async function makeMarks(options: paramsTypeOfMakeMarks): Promise<{ reply_markup: InlineKeyboard; parse_mode: ParseMode }> {
    switch (options.key) {
        case "lang":
            const back = options.lang === 2 ? "Ortga qaytish" : options.lang === 1 ? "Ортга қайтиш" : "Ortga qaytish / Ортга қайтиш";
            const marks = new InlineKeyboard().text("🇺🇿 Oʻzbekcha", "lang_2").text("🇺🇿 Ўзбекча", "lang_1").row();
            if (Boolean(options.lang)) marks.text(back, `settings`).row();
            return { reply_markup: marks, parse_mode: "HTML" };
        case "time":
            return { reply_markup: getTimeKeyboard(options.lang, options.is_back), parse_mode: "HTML" };
        case "vil":
            return { reply_markup: getVilsKeyboard(options.lang, options.is_back), parse_mode: "HTML" };
        case "reg":
            return { reply_markup: getRegsKeyboard(options.lang, options.vil), parse_mode: "HTML" };
        case "settings":
            return { reply_markup: getSettingsKeyboard(options.lang, options.is_active), parse_mode: "HTML" };
        case "dashboard":
            return { reply_markup: await getDashboardKeyboard(options.lang, options.city), parse_mode: "HTML" };
    }
}

bot.command("start", async (ctx) => {
    const payload = ctx.match;
    const utm = payload.slice(payload.indexOf("utm-") + 4);

    const [user]: User[] = await saveUser(ctx, { utm });

    if (!user.language) await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.reply(await MESSAGES.DASHBOARD(user), await makeMarks({ key: "dashboard", lang, city: Number(user.city) }));
        }
    }
});

bot.callbackQuery(/lang_(2|1)/, async (ctx) => {
    const language = ctx.callbackQuery.data.split("_")[1];

    const [user] = await saveUser(ctx, { language });

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(await MESSAGES.DASHBOARD(user), await makeMarks({ key: "dashboard", lang, city: Number(user.city) }));
        }
    }

    await ctx.answerCallbackQuery({ text: language === "2" ? "Lotincha tanlandi" : "Кириллча танланди" });
});

bot.callbackQuery(/vils/, async (ctx) => {
    const [user] = await saveUser(ctx);

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang, is_back: Boolean(user.city) }));
    }
});

bot.callbackQuery(/vil_(\d+)/, async (ctx) => {
    const vil_code = ctx.callbackQuery.data.split("_")[1];

    const [user] = await saveUser(ctx);

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "reg", lang, vil: Number(vil_code) }));
    }
});

bot.callbackQuery(/reg_(\d+)/, async (ctx) => {
    const city = ctx.callbackQuery.data.split("_")[1];

    const [user] = await saveUser(ctx, { city });

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(await MESSAGES.DASHBOARD(user), await makeMarks({ key: "dashboard", lang, city: Number(user.city) }));
        }
    }

    if (user.language) {
        const cityname = regions.find((e) => e.id == city);
        const text = user.language == 2 ? `Hudud tanlandi: ${cityname?.name_2}` : `Ҳудуд танланди: ${cityname?.name_1}`;
        await ctx.answerCallbackQuery({ text });
    }
});

bot.callbackQuery(/settings/, async (ctx) => {
    const [user] = await saveUser(ctx);

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SETTINGS(user), await makeMarks({ key: "settings", lang, is_active: Boolean(user.is_active) }));
        }
    }
});

bot.callbackQuery(/dashboard/, async (ctx) => {
    const [user] = await saveUser(ctx);

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(await MESSAGES.DASHBOARD(user), await makeMarks({ key: "dashboard", lang, city: Number(user.city) }));
        }
    }
});

bot.callbackQuery(/vaqt/, async (ctx) => {
    const [user] = await saveUser(ctx);
    const lang = Number(user.language) === 2 ? 2 : 1;
    await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
    await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang, is_back: Boolean(user.time) }));
});

bot.callbackQuery(/language/, async (ctx) => {
    const [user] = await saveUser(ctx);
    const lang = Number(user.language) === 2 ? 2 : 1;
    await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
    await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang", lang }));
});

bot.callbackQuery(/time_(\d+)/, async (ctx) => {
    const time = ctx.callbackQuery.data.split("_")[1];

    const [user] = await saveUser(ctx, { time });

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(await MESSAGES.DASHBOARD(user), await makeMarks({ key: "dashboard", lang, city: Number(user.city) }));
        }
    }

    if (user.language) {
        const hourStr = user.time !== undefined && user.time !== null ? String(user.time).padStart(2, "0") : "00";
        const hour = hourStr + ":00";
        await ctx.answerCallbackQuery({ text: user.language == 2 ? `Vaqt tanlandi: ${hour}` : `Вақт танланди: ${hour}` });
    }
});

bot.callbackQuery(/subscribe_(true|false)/, async (ctx) => {
    const is_active = ctx.callbackQuery.data.split("_")[1] === "true";

    const [user] = await saveUser(ctx, { is_active });

    const lang = Number(user.language) === 2 ? 2 : 1;
    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SETTINGS(user), await makeMarks({ key: "settings", lang, is_active: Boolean(user.is_active) }));
        }
    }

    const text = lang === 2 ? (is_active ? "Obuna tiklandi" : "Obuna to'xtatildi") : is_active ? "Обуна тикланди" : "Обуна тўхтатилди";
    await ctx.answerCallbackQuery({ text });
});

bot.callbackQuery(/prayertime/, async (ctx) => {
    const [user] = await saveUser(ctx);

    if (!user.language) {
        await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
        await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: "lang" }));
    } else {
        const lang = Number(user.language) === 2 ? 2 : 1;

        if (!user.city) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: "vil", lang }));
        } else if (!user.time) {
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: "time", lang }));
        } else {
            const { data: userTime } = await supabase.from("prayer_times").select("*").eq("city", user.city);
            const message = makeMessage(lang, userTime?.[0]);
            await ctx.deleteMessage().catch(async (err) => await dontDelete(ctx, err));
            await ctx.reply(message, { parse_mode: "HTML" });
            await ctx.reply(await MESSAGES.DASHBOARD(user), await makeMarks({ key: "dashboard", lang, city: Number(user.city) }));
        }
    }
});

bot.command("broadcast", async (ctx) => {
    if (String(ctx.chat.id) === ADMIN_ID) {
        const msg = await bot.api.sendMessage(LOG_CHAT, "Broadcast...");
        await ctx.reply(`Broadcast started: https://t.me/c/${LOG_CHAT.slice(4)}/${msg.message_id}`);

        const { data, error } = await supabase.from("prayer_time_users").select("*").eq("is_active", true);
        if (error) {
            await sendLog(`❗️ prayer_time_users table'ni o'qib bo'lmadi: ${error.message}`, { reply_to_message_id: msg.message_id });
            return;
        }

        const scs = [];
        const ers = [];
        let counter = 0;
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

                    await bot.api.sendMessage(data[i].tg_id, message, { reply_markup: keyboard, parse_mode: "HTML" });

                    await new Promise((resolve) => setTimeout(resolve, 40));
                    scs.push(data[i].tg_id);
                } catch (error) {
                    ers.push(data[i].tg_id);

                    if (error instanceof GrammyError && error.description.includes("bot was blocked by the user")) {
                        await sendLog(`Foydalanuvchi ${data[i].tg_id} botni bloklagan.`, { reply_to_message_id: msg.message_id });
                        await deactivateService(data[i].tg_id);
                    } else if (error instanceof GrammyError && error.description.includes("user is deactivated")) {
                        await sendLog(`Foydalanuvchi ${data[i].tg_id} deleted account qilgan.`, { reply_to_message_id: msg.message_id });
                        await deactivateService(data[i].tg_id);
                    } else if (error instanceof Error) {
                        await sendLog(`Xatolik yuz berdi (${data[i].tg_id}): \n${error.message}`, { reply_to_message_id: msg.message_id });
                    } else {
                        await sendLog(`Xatolik yuz berdi (${data[i].tg_id}): \n${error}`, { reply_to_message_id: msg.message_id });
                    }
                }
            }
        }

        const message = `✅ Sozlamalar bildirishnomalari yuborildi\n\n🎯 Yuborildi: ${scs.length}\n💣 Xato: ${ers.length}\n🏆 Jami: ${counter}`;
        await sendLog(message, { reply_to_message_id: msg.message_id });
    } else {
        await bot.api.sendMessage(LOG_CHAT, "No broadcast: " + ctx.chat.id);
    }
});

bot.catch(async (err) => {
    const ctx = err.ctx;
    await sendLog(`Error while handling update ${ctx.update.update_id}:`);
    if (err.error instanceof Error) await sendLog(err.error.message);
});

export const handleUpdate = webhookCallback(bot, "hono");
