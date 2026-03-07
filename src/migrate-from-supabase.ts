import { supabase } from "./supabase";
import { db } from "./db";
import { ptu, pt } from "./db/schema";
import { eq } from "drizzle-orm";

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
            tgId: String(row.tg_id),
            firstName: row.first_name,
            lastName: row.last_name,
            username: row.username,
            city: row.city,
            language: row.language,
            time: row.time,
            isActive: row.is_active ?? true,
        }));

        await db
            .insert(ptu)
            .values(values)
            .onConflictDoUpdate({
                target: ptu.tgId,
                set: {
                    firstName: (values[0] as any).firstName,
                    lastName: (values[0] as any).lastName,
                    username: (values[0] as any).username,
                    city: (values[0] as any).city,
                    language: (values[0] as any).language,
                    time: (values[0] as any).time,
                    isActive: (values[0] as any).isActive,
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
            dateTextCyrl: row.date_text_cyrl,
            dateTextUz: row.date_text_uz,
            tong: row.tong,
            quyosh: row.quyosh,
            peshin: row.peshin,
            asr: row.asr,
            shom: row.shom,
            xufton: row.xufton,
            updatedDate: row.updated_date,
        }));

        await db
            .insert(pt)
            .values(values)
            .onConflictDoUpdate({
                target: pt.city,
                set: {
                    dateTextCyrl: (values[0] as any).dateTextCyrl,
                    dateTextUz: (values[0] as any).dateTextUz,
                    tong: (values[0] as any).tong,
                    quyosh: (values[0] as any).quyosh,
                    peshin: (values[0] as any).peshin,
                    asr: (values[0] as any).asr,
                    shom: (values[0] as any).shom,
                    xufton: (values[0] as any).xufton,
                    updatedDate: (values[0] as any).updatedDate,
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
    }
}

main();
