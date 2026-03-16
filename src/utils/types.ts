import { ParseMode } from "@grammyjs/types";
import { CallbackQueryContext } from "grammy";
import { CommandContext } from "grammy";
import { pt, ptu } from "../db/schema";
import { Context } from "grammy";

export interface User {
    id?: number;
    tg_id: string | number;
    first_name: string;
    last_name: string | null;
    username: string | null;
    city?: number | string;
    time?: number | string;
    language?: number | string;
    status?: string;
    is_active?: boolean;
}

type st = number | string | undefined;
export type SaveUserData = { city?: st; time?: st; language?: st; is_active?: boolean; utm?: string; status?: string };

export type CTX = CommandContext<Context> | CallbackQueryContext<Context> | Context;

export type paramsTypeOfMakeMarks =
    | { key: "lang"; lang?: number }
    | { key: "time"; lang: number; is_back?: boolean }
    | { key: "vil"; lang: number; is_back?: boolean }
    | { key: "reg"; lang: number; vil: number }
    | { key: "settings"; lang: number; is_active: boolean }
    | { key: "dashboard"; lang: number; city: number };

export type LogOptions = { parse_mode?: ParseMode; reply_to_message_id?: number };

export interface UserTimeData {
    date_text_uz: string;
    date_text_cyrl: string;
    tong: string;
    quyosh: string;
    peshin: string;
    asr: string;
    shom: string;
    xufton: string;
    city: string;
}

export interface PrayerUser {
    tg_id: number | string;
    language: number;
    city: string;
    is_active: boolean;
    time: number;
}

export type PrayerTimesSelect = typeof pt.$inferSelect;
export type PrayerTimeUserSelect = typeof ptu.$inferSelect;

export function mapDbUserToUser(row: PrayerTimeUserSelect): User {
    return {
        id: row.id,
        tg_id: row.tg_id ?? "",
        first_name: row.first_name ?? "",
        last_name: row.last_name ?? null,
        username: row.username ?? null,
        city: row.city ?? undefined,
        time: row.time ?? undefined,
        language: row.language ?? undefined,
        is_active: row.is_active ?? undefined,
    };
}

export function mapDbPrayerTimeToUserTimeData(row: PrayerTimesSelect): UserTimeData {
    return {
        date_text_uz: row.date_text_uz,
        date_text_cyrl: row.date_text_cyrl,
        tong: row.tong,
        quyosh: row.quyosh,
        peshin: row.peshin,
        asr: row.asr,
        shom: row.shom,
        xufton: row.xufton,
        city: String(row.city),
    };
}

export type Status = "new" | "active" | "inactive" | "deleted_account" | "has_blocked" | "other";
