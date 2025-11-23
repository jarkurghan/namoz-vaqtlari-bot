import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import regions from "./src/data/cities.json" with { type: "json" };
import "./src/scheduler/get-data.js"
import "./src/scheduler/send.js"
import "dotenv/config";

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) throw new Error("Iltimos, .env faylida barcha kerakli ma'lumotlarni kiriting.");

function getTimeKeyboard() {
    const keyboard = new InlineKeyboard();

    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, "0");
        keyboard.text(`${hour}:00`, `time_${hour}`);
        if ((i + 1) % 4 === 0) keyboard.row();
    }

    return keyboard;
}

function getRegionKeyboardUZ() {
    const keyboards = [];
    const pageSize = 12;
    const pageCount = Math.ceil(regions.length / pageSize);

    for (let page = 0; page < pageCount; page++) {
        const keyboard = new InlineKeyboard();
        const start = page * pageSize;
        const end = start + pageSize;

        for (let i = start; i < end && regions[i]; i += 2) {
            if (regions[i + 1]) keyboard.text(regions[i].name_2, `region_${regions[i].id}`).text(regions[i + 1].name_2, `region_${regions[i + 1].id}`).row();
            else keyboard.text(regions[i].name_2, `region_${regions[i].id}`).row();
        }

        if (page === 0) keyboard.text("Keyingi", `list_${page + 1}`).row();
        else if (page === pageCount - 1) keyboard.text("Oldingi", `list_${page - 1}`).row();
        else keyboard.text("Oldingi", `list_${page - 1}`).text("Keyingi", `list_${page + 1}`).row();

        keyboards.push({ reply_markup: keyboard });
    }

    return keyboards;
}

function getRegionKeyboardKR() {
    const keyboards = [];
    const pageSize = 12;
    const pageCount = Math.ceil(regions.length / pageSize);

    for (let page = 0; page < pageCount; page++) {
        const keyboard = new InlineKeyboard();
        const start = page * pageSize;
        const end = start + pageSize;

        for (let i = start; i < end && regions[i]; i += 2) {
            if (regions[i + 1]) keyboard.text(regions[i].name_1, `region_${regions[i].id}`).text(regions[i + 1].name_1, `region_${regions[i + 1].id}`).row();
            else keyboard.text(regions[i].name_1, `region_${regions[i].id}`).row();
        }

        if (page === 0) keyboard.text("Кейинги", `list_${page + 1}`).row();
        else if (page === pageCount - 1) keyboard.text("Олдинги", `list_${page - 1}`).row();
        else keyboard.text("Олдинги", `list_${page - 1}`).text("Кейинги", `list_${page + 1}`).row();

        keyboards.push({ reply_markup: keyboard });
    }

    return keyboards;
}

function getSettingsKeyboard(lang) {
    const keyboard = new InlineKeyboard();
    keyboard.text(lang === 1 ? "Тилни ўзгартириш" : "Tilni o'zgartirish", `language`).row();
    keyboard.text(lang === 1 ? "Ҳудудни ўзгартириш" : "Hududni o'zgartirish", `list_0`).row();
    keyboard.text(lang === 1 ? "Юбориш вақти" : "Yuborish vaqti", `vaqt`).row();
    return { reply_markup: keyboard };
}

function getSettingsMessage(user) {
    const city = regions.find(e => e.id == user.city);
    const hour = user.time.toString().padStart(2, "0");
    return user.language === 2 ?
        `Hozirgi sozlamalar:\n\n` + "Til: 🇺🇿 Oʻzbekcha\n" + `Hudud: ${city.name_2}\n` + `Tarqatma vaqti: ${hour}:00` :
        'Ҳозирги созламалар:\n\n' + "Тил: 🇺🇿 Ўзбекча\n" + `Ҳудуд: ${city.name_1}\n` + `Тарқатма вақти: ${hour}:00`;
}

const RESPONSES = {
    SELECT_LANG: {
        MESSAGE: "Iltimos, tilni tanlang!\nИлтимос, тилни танланг:",
        MARKS: { reply_markup: new InlineKeyboard().text("🇺🇿 Oʻzbekcha", "lang_2").text("🇺🇿 Ўзбекча", "lang_1") }
    },
    SELECT_TIME: {
        MESSAGE: { 2: "Kunlik namoz vaqtlari qaysi vaqtda yuborilishini xohlaysiz?", 1: "Кунлик намоз вақтлари қайси вақтда юборилишини хоҳлайсиз?" },
        MARKS: { reply_markup: getTimeKeyboard() }
    },
    SELECT_REGION: {
        MESSAGE: { 2: "Hududni tanlang", 1: "Ҳудудни танланг" },
        MARKS: { 2: getRegionKeyboardUZ(), 1: getRegionKeyboardKR() },
    }
}

const bot = new Bot(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function saveUser(ctx, data) {
    const user = ctx.from;
    if (!user) return;

    const userData = {
        tg_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
    };

    if (data && data.language) userData.language = data.language;
    if (data && data.city) userData.city = data.city;
    if (data && data.time) userData.time = data.time;

    try {
        const { data, error } = await supabase
            .from("users_namoz_vaqtlari_bot")
            .upsert(userData, { onConflict: "tg_id" })
            .select("*");

        if (error) console.error("Supabasega saqlashda xato:", error);

        return data
    } catch (err) {
        console.error(err);
    }
}

bot.command("start", async (ctx) => {
    const [user] = await saveUser(ctx);

    if (!user.language) await ctx.reply(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
    else if (!user.city) await ctx.reply(RESPONSES.SELECT_REGION.MESSAGE[user.language], RESPONSES.SELECT_REGION.MARKS[user.language][0]);
    else if (!user.time) await ctx.reply(RESPONSES.SELECT_TIME.MESSAGE[user.language], RESPONSES.SELECT_TIME.MARKS);
    else await ctx.reply(getSettingsMessage(user), getSettingsKeyboard(user.language));

});

bot.callbackQuery(/lang_(2|1)/, async (ctx) => {
    const language = ctx.callbackQuery.data.split('_')[1];

    const [user] = await saveUser(ctx, { language });
    if (!user.city) await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[user.language], RESPONSES.SELECT_REGION.MARKS[user.language][0]);
    else if (!user.time) await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[user.language], RESPONSES.SELECT_TIME.MARKS);
    else await ctx.editMessageText(getSettingsMessage(user), getSettingsKeyboard(user.language));

    await ctx.answerCallbackQuery({ text: language === '2' ? 'Lotincha tanlandi' : 'Кириллча танланди' });
});

bot.callbackQuery(/region_(\d+)/, async (ctx) => {
    const city = ctx.callbackQuery.data.split('_')[1];

    const [user] = await saveUser(ctx, { city });
    if (!user.language) await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
    else if (!user.time) await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[user.language], RESPONSES.SELECT_TIME.MARKS);
    else await ctx.editMessageText(getSettingsMessage(user), getSettingsKeyboard(user.language));

    if (user.language) {
        const cityname = regions.find(e => e.id == city);
        await ctx.answerCallbackQuery({ text: user.language == 2 ? `Hudud tanlandi: ${cityname.name_2}` : `Ҳудуд танланди: ${cityname.name_1}` });
    }
});

bot.callbackQuery(/list_(\d+)/, async (ctx) => {
    const index = ctx.callbackQuery.data.split('_')[1];
    const [user] = await saveUser(ctx);
    await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[user.language], RESPONSES.SELECT_REGION.MARKS[user.language][index]);
});

bot.callbackQuery(/vaqt/, async (ctx) => {
    const [user] = await saveUser(ctx);
    await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[user.language], RESPONSES.SELECT_TIME.MARKS);
});

bot.callbackQuery(/language/, async (ctx) => {
    await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
});

bot.callbackQuery(/time_(\d+)/, async (ctx) => {
    const time = ctx.callbackQuery.data.split('_')[1];

    const [user] = await saveUser(ctx, { time });
    if (!user.language) await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
    else if (!user.city) await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[user.language], RESPONSES.SELECT_REGION.MARKS[user.language][0]);
    else await ctx.editMessageText(getSettingsMessage(user), getSettingsKeyboard(user.language));

    if (user.language) {
        const hour = user.time.toString().padStart(2, "0") + ":00";
        await ctx.answerCallbackQuery({ text: user.language == 2 ? `Vaqt tanlandi: ${hour}` : `Вақт танланди: ${hour}` });
    }
});

bot.start();