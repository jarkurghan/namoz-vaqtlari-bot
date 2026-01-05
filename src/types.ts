import { ParseMode } from "@grammyjs/types";
import { CallbackQueryContext } from "grammy";
import { CommandContext } from "grammy";
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
    is_active?: boolean;
}

type st = number | string | undefined;
export type SaveUserData = { city?: st; time?: st; language?: st; is_active?: boolean; utm?: string };

export type CTX = CommandContext<Context> | CallbackQueryContext<Context>;

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

export type HijriMonth =
    | "жумадис сони"
    | "ражаб"
    | "шаъбон"
    | "Рамазон"
    | "шаввол"
    | "зулқаъда"
    | "зулҳижжа"
    | "муҳаррам"
    | "сафар"
    | "рабиъул аввал"
    | "рабиъус сони"
    | "жумадул аввал"
    | "";
export type Month = "январь" | "февраль" | "март" | "апрель" | "май" | "июнь" | "июль" | "август" | "сентябрь" | "октябрь" | "ноябрь" | "декабрь" | "";
export type Weekday = "якшанба" | "душанба" | "сешанба" | "чоршанба" | "пайшанба" | "жума" | "шанба" | "";
