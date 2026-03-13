import regions from "../utils/cities.json";
import { ParseMode } from "@grammyjs/types/message";
import { isActiveCity } from "./is-city-active";
import { paramsTypeOfMakeMarks } from "../utils/types";
import { InlineKeyboard } from "grammy";
import { User } from "../utils/types";

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
    keyboard.text(lang === 2 ? "✅ Tayyor" : "✅ Тайёр", `dashboard`).row();

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

export const MESSAGES = {
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

export async function makeMarks(options: paramsTypeOfMakeMarks): Promise<{ reply_markup: InlineKeyboard; parse_mode: ParseMode }> {
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
