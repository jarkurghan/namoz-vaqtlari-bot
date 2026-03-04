/// <reference lib="dom" />

import { sendLog } from "./log";
import { supabase } from "./supabase";
import { chromium } from "playwright";
import regions from "./cities.json";

const TARGET_URL = "https://islom.uz";

function parseTime(str: string): string {
    const m = str.match(/(\d{1,2}):(\d{2})/);
    if (!m) return "";
    const h = m[1]!.padStart(2, "0");
    const min = m[2]!.padStart(2, "0");
    return `${h}:${min}`;
}

function trim(str?: string | null): string {
    return str?.trim() ?? "";
}

async function getPrayerTimesFromIslomUz(cityIds: string[]) {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
    try {
        // brauzer ochish
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // islom.uz saytiga kirish
        await page.goto(TARGET_URL);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // sanani olish
        const langBtn = page.locator(".header-top .c-dropdown button.media-info").last();

        await langBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 400));
        await page.getByText("O'zbek", { exact: true }).first().click();
        await new Promise((resolve) => setTimeout(resolve, 800));
        const dateTextUz = await page.locator(".header-top__date").first().textContent().then(trim);

        await langBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 400));
        await page.getByText("Ўзбек").first().click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        const dateTextCyrl = await page.locator(".header-top__date").first().textContent().then(trim);

        await page.click('a[href="/taqvim"]');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // namoz vaqtlari olish
        const timestamp = Date.now();
        const cities = regions.filter((c) => cityIds.includes(c.id));

        for (let i = 0; i < cities.length; i++) {
            try {
                const city = cities[i];
                if (city) {
                    console.log(`[${i + 1}/${cities.length}] ${city.name_1} (${city.viloyat_1})...`);

                    await page.click(".taqvim-city-btn");
                    await new Promise((resolve) => setTimeout(resolve, 400));
                    await page.getByText(city.name_1, { exact: true }).first().click();
                    await page.waitForFunction(() => !document.body.innerText.includes("Юкланмоқда"), { timeout: 15000 }).catch(() => null);
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    const times = await page.evaluate(() => {
                        const items = Array.from(document.querySelectorAll(".taqvim-prayer-list li"));
                        const indices = [0, 1, 3, 4, 5, 6];
                        return indices.map((i) => {
                            const strong = items[i]?.querySelector("strong");
                            const text = strong?.textContent?.trim() ?? "";
                            const m = text.match(/(\d{1,2}:\d{2})/);
                            return m ? m[1]! : "";
                        });
                    });

                    const record = {
                        city: city.id,
                        date_text_cyrl: dateTextCyrl,
                        date_text_uz: dateTextUz,
                        tong: parseTime(times[0] ?? ""),
                        quyosh: parseTime(times[1] ?? ""),
                        peshin: parseTime(times[2] ?? ""),
                        asr: parseTime(times[3] ?? ""),
                        shom: parseTime(times[4] ?? ""),
                        xufton: parseTime(times[5] ?? ""),
                        updated_date: timestamp,
                    };

                    // bazaga yozish
                    const { error } = await supabase.from("prayer_times").upsert(record, { onConflict: "city" });
                    if (error) {
                        await sendLog(`❗️ ${cities[i].name_2} shahar uchun namoz vaqtlarini bazaga yozib bo'lmadi\n\n${error.message}`);
                    }
                }
            } catch (error) {
                const errorMsg = `❗️ ${cities[i]?.name_2} shahar uchun namoz vaqtlarini olib bo'lmadi\n\n`;
                if (error instanceof Error) {
                    await sendLog(`${errorMsg}${error.message}`);
                } else {
                    await sendLog(`${errorMsg}${error}`);
                }
            }
        }

        console.log("Bajarildi!");
    } catch (error) {
        const errorMsg = `❗️ Namoz vaqtlarini olib bo'lmadi\n\n`;
        if (error instanceof Error) {
            await sendLog(`${errorMsg}${error.message}`);
        } else {
            await sendLog(`${errorMsg}${error}`);
        }
    } finally {
        // brauzer yopish
        if (browser) {
            await browser.close();
        }
    }
}

async function main() {
    const { data, error } = await supabase.from("prayer_time_users").select("city").eq("is_active", true);
    if (error) return console.error(error);
    if (!data?.length) return;

    const set = [...new Set(data.map((e) => e.city))];
    await getPrayerTimesFromIslomUz(set);
    return;
}

main();
