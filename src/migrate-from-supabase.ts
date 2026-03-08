import { supabase } from "./supabase";
import { db, sql } from "./db";
import { ptu, pt } from "./db/schema";

type SupabasePrayerTimeUser = {
    id: number;
    tg_id: string | number;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    city: number | null;
    language: number | null;
    time: number | null;
    is_active: boolean | null;
};

type SupabasePrayerTime = {
    id: number;
    city: number;
    date_text_cyrl: string;
    date_text_uz: string;
    tong: string;
    quyosh: string;
    peshin: string;
    asr: string;
    shom: string;
    xufton: string;
    updated_date: number;
};

async function migratePrayerTimeUsers() {
    const { data, error } = await supabase.from("prayer_time_users").select("*");

    if (error) {
        console.error("❗️ Supabase'dan prayer_time_users o'qishda xato:", error.message);
        throw error;
    }

    const rows = (data as SupabasePrayerTimeUser[]) || [];
    if (!rows.length) {
        console.log("✅ Supabase prayer_time_users bo'sh, migratsiya kerak emas");
        return;
    }

    console.log(`➡️ prayer_time_users migratsiya qilinmoqda: ${rows.length} ta qator`);

    // kichik bo'laklarga bo'lib yuboramiz
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        const values = chunk.map((row) => ({
            id: row.id,
            tg_id: String(row.tg_id),
            first_name: row.first_name,
            last_name: row.last_name,
            username: row.username,
            city: row.city,
            language: row.language,
            time: row.time,
            is_active: row.is_active ?? true,
        }));

        await db
            .insert(ptu)
            .values(values)
            .onConflictDoUpdate({
                target: ptu.tg_id,
                set: {
                    first_name: (values[0] as any).first_name,
                    last_name: (values[0] as any).last_name,
                    username: (values[0] as any).username,
                    city: (values[0] as any).city,
                    language: (values[0] as any).language,
                    time: (values[0] as any).time,
                    is_active: (values[0] as any).is_active,
                },
            });

        console.log(`   ✅ prayer_time_users chunk ${i}–${i + chunk.length - 1} ko'chirildi`);
    }

    console.log("✅ prayer_time_users migratsiyasi tugadi");
}

async function migratePrayerTimes() {
    const { data, error } = await supabase.from("prayer_times").select("*");

    if (error) {
        console.error("❗️ Supabase'dan prayer_times o'qishda xato:", error.message);
        throw error;
    }

    const rows = (data as SupabasePrayerTime[]) || [];
    if (!rows.length) {
        console.log("✅ Supabase prayer_times bo'sh, migratsiya kerak emas");
        return;
    }

    console.log(`➡️ prayer_times migratsiya qilinmoqda: ${rows.length} ta qator`);

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        const values = chunk.map((row) => ({
            id: row.id,
            city: row.city,
            date_text_cyrl: row.date_text_cyrl,
            date_text_uz: row.date_text_uz,
            tong: row.tong,
            quyosh: row.quyosh,
            peshin: row.peshin,
            asr: row.asr,
            shom: row.shom,
            xufton: row.xufton,
            updated_date: row.updated_date,
        }));

        await db
            .insert(pt)
            .values(values)
            .onConflictDoUpdate({
                target: pt.city,
                set: {
                    date_text_cyrl: (values[0] as any).date_text_cyrl,
                    date_text_uz: (values[0] as any).date_text_uz,
                    tong: (values[0] as any).tong,
                    quyosh: (values[0] as any).quyosh,
                    peshin: (values[0] as any).peshin,
                    asr: (values[0] as any).asr,
                    shom: (values[0] as any).shom,
                    xufton: (values[0] as any).xufton,
                    updated_date: (values[0] as any).updated_date,
                },
            });

        console.log(`   ✅ prayer_times chunk ${i}–${i + chunk.length - 1} ko'chirildi`);
    }

    console.log("✅ prayer_times migratsiyasi tugadi");
}

async function main() {
    try {
        console.log("🚀 Supabase → PostgreSQL (Drizzle) migratsiya boshlanmoqda...");

        await migratePrayerTimeUsers();
        await migratePrayerTimes();

        console.log("🏁 Barcha jadvalar muvaffaqiyatli ko'chirildi");
    } catch (err) {
        console.error("❌ Migratsiya vaqtida xato:", err);
        process.exitCode = 1;
    } finally {
        await sql.end({ timeout: 5 });
    }
}

main();
