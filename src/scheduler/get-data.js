import * as cheerio from "cheerio";
import regions from "../data/cities.json" with { type: "json" };
import scheduler from "node-schedule";
import axios from "axios";
import fs from "fs";

const TARGET_URL = "https://islom.uz";

async function handler(cities, month) {
    try {
        const { data: home } = await axios.get(TARGET_URL);
        const $home = cheerio.load(home);

        const dateClassName = '.date_time';
        const dateElement = $home(dateClassName);
        const date = dateElement.text().trim();
        const prayerTimes = {};

        for (let i = 0; i < cities.length; i++) {
            const { data: table } = await axios.get(TARGET_URL + "/vaqtlar/" + cities[i] + "/" + month);
            const $table = cheerio.load(table);

            const rowClassName = "tr.p_day.bugun > td";
            const nowTimes = [];
            const tds = $table(rowClassName);
            tds.slice(3).each((index, element) => {
                const $element = $table(element);
                const timeText = $element.text().trim();
                nowTimes.push(timeText);
            });

            prayerTimes[cities[i]] = nowTimes;
        }

        await fs.promises.writeFile("./src/data/data.json", JSON.stringify({ date, prayerTimes }, null, 4), "utf-8");
        return;
    } catch (error) {
        console.error(error);
    }
}

scheduler.scheduleJob('1 0 * * *', async function () {
    const nowTashkent = new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" });
    const month = nowTashkent.slice(0, nowTashkent.indexOf("/"));
    await handler(regions.map(e => e.id), month);

    console.log("noted ✅");
    return;
});