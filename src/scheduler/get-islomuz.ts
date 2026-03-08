/// <reference lib="dom" />

import regions from "../cities.json";
import { chromium } from "playwright";
import { sendLog } from "../log";
import { ptu } from "../db/schema";
import { pt } from "../db/schema";
import { eq } from "drizzle-orm";
import { db, sql } from "../db";

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

function parseDate(dateTextUz: string, dateTextCyrl: string): { date_text_uz: string; date_text_cyrl: string } {
    const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
    const low = (s: string) => (s ? s.toLowerCase() : "");

    const reUz = /(\d{4})\s+yil\s+(\d{1,2})\s+(\S+)\s+\|\s+(\d{4})\s+yil\s+(\d{1,2})\s+(\S+),\s*(\S+)/i;
    const reCyrl = /(\d{4})\s+йил\s+(\d{1,2})\s+(\S+)\s+\|\s+(\d{4})\s+йил\s+(\d{1,2})\s+(\S+),\s*(\S+)/i;

    const mUz = dateTextUz.match(reUz);
    const mCyrl = dateTextCyrl.match(reCyrl);
    if (!mUz || !mCyrl) return { date_text_uz: dateTextUz, date_text_cyrl: dateTextCyrl };

    const date_text_uz = [cap(mUz[7]!), `${mUz[5]!}-${low(mUz[6]!)} ${mUz[4]!}`, `${cap(mUz[3]!)} ${mUz[2]!}, ${mUz[1]!}`].join("\n");
    const date_text_cyrl = [cap(mCyrl[7]!), `${mCyrl[5]!}-${low(mCyrl[6]!)} ${mCyrl[4]!}`, `${cap(mCyrl[3]!)} ${mCyrl[2]!}, ${mCyrl[1]!}`].join("\n");

    return { date_text_uz, date_text_cyrl };
}

async function getPrayerTimesFromIslomUz(cityIds: string[]) {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
    try {
        // brauzer ochish
        console.log("Brauzer ochish...");
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // islom.uz saytiga kirish
        await page.goto(TARGET_URL);
        console.log("Islom.uz saytiga kirish...");
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
        console.log("Namoz vaqtlari olish...");
        const timestamp = Date.now();

        console.log(61, cityIds.length);
        const cities = regions.filter((c) => cityIds.includes(c.id));
        console.log(63, cities.length);

        for (let i = 0; i < cities.length; i++) {
            try {
                const city = cities[i];
                if (city) {
                    console.log(`[${i + 1}/${cities.length}] ${city.name_2} (${city.viloyat_2})...`);

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

                    const { date_text_uz, date_text_cyrl } = parseDate(dateTextUz, dateTextCyrl);
                    const record = {
                        id: Number(city.id),
                        city: Number(city.id),
                        date_text_cyrl: date_text_cyrl,
                        date_text_uz: date_text_uz,
                        tong: parseTime(times[0] ?? ""),
                        quyosh: parseTime(times[1] ?? ""),
                        peshin: parseTime(times[2] ?? ""),
                        asr: parseTime(times[3] ?? ""),
                        shom: parseTime(times[4] ?? ""),
                        xufton: parseTime(times[5] ?? ""),
                        updated_date: timestamp,
                    };

                    // bazaga yozish (Drizzle)
                    await db
                        .insert(pt)
                        .values(record)
                        .onConflictDoUpdate({
                            target: pt.city,
                            set: {
                                date_text_cyrl: record.date_text_cyrl,
                                date_text_uz: record.date_text_uz,
                                tong: record.tong,
                                quyosh: record.quyosh,
                                peshin: record.peshin,
                                asr: record.asr,
                                shom: record.shom,
                                xufton: record.xufton,
                                updated_date: record.updated_date,
                            },
                        });
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
        console.log("Brauzer yopish...");
        if (browser) {
            await browser.close();
        }

        console.log("Bajarildi!");
    }
}

async function main() {
    try {
        const rows = await db.select({ city: ptu.city }).from(ptu).where(eq(ptu.is_active, true));

        if (!rows.length) return;

        const set = [...new Set(rows.filter((e) => e.city != null).map((e) => String(e.city)))];
        await getPrayerTimesFromIslomUz(set);
        return;
    } catch (error) {
        console.error(error);
    }
}

const success = async () => {
    await sql.end({ timeout: 5 });
};

const end = async (err: unknown) => {
    console.error(err);
    try {
        await sql.end({ timeout: 5 });

        const errorMsg = `❗️ Scheduler (send prayer times)da xatolik yuz berdi:\n\n`;
        if (err instanceof Error) {
            await sendLog(`${errorMsg}${err.message}`);
        } else {
            await sendLog(`${errorMsg}${err}`);
        }
    } finally {
        process.exit(1);
    }
};

main().then(success).catch(end);
