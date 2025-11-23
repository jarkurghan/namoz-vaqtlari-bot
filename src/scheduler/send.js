import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import regions from "../data/cities.json" with { type: "json" };
import data from "../data/data.json" with { type: "json" };
import scheduler from "node-schedule";
import { Bot } from "grammy";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Bot(BOT_TOKEN);

const cronJob = (index) => {
    return async () => {
        const { data: users, error } = await supabase.from('users_namoz_vaqtlari_bot').select('*')

        console.log(index);
        console.log(users);
        
        if (error) return console.log(error);

        for (let i = 0; i < users.length; i++) {
            const message = `${data.date}\n\n`
                + `Tong: ${data.prayerTimes[users[i].city][0]}\n`
                + `Quyosh: ${data.prayerTimes[users[i].city][1]}\n`
                + `Pеshin: ${data.prayerTimes[users[i].city][2]}\n`
                + `Asr: ${data.prayerTimes[users[i].city][3]}\n`
                + `Shom: ${data.prayerTimes[users[i].city][4]}\n`
                + `Xufton: ${data.prayerTimes[users[i].city][5]}\n`;

            await bot.api.sendMessage(users[i].tg_id, message);
        }

        console.log("sended ✅");
        return;
    }
}

function jobs() {
    const crons = ['2 0 * * *'];
    for (let i = 1; i < 24; i++) crons.push(`0 ${i} * * *`);

    for (let i = 0; i < crons.length; i++) {
        scheduler.scheduleJob(crons[i], cronJob(i));
    }
}

jobs();
