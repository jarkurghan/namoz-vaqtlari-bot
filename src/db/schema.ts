import { bigint, boolean, integer, pgTable, serial, text, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";

export const ptu = pgTable(
    "prayer_time_users",
    {
        id: serial("id").primaryKey(),
        tgId: varchar("tg_id", { length: 255 }),
        firstName: text("first_name"),
        lastName: text("last_name"),
        username: text("username"),
        city: integer("city"),
        language: integer("language"),
        time: integer("time"),
        isActive: boolean("is_active").notNull().default(true),
    },
    (table) => [uniqueIndex("users_namoz_vaqtlari_bot_tg_id_unique").on(table.tgId)],
);

export const pt = pgTable(
    "prayer_times",
    {
        id: bigint("id", { mode: "number" }).primaryKey().notNull(),
        city: integer("city").notNull(),
        dateTextCyrl: text("date_text_cyrl").notNull(),
        dateTextUz: text("date_text_uz").notNull(),
        tong: varchar("tong", { length: 5 }).notNull(),
        quyosh: varchar("quyosh", { length: 5 }).notNull(),
        peshin: varchar("peshin", { length: 5 }).notNull(),
        asr: varchar("asr", { length: 5 }).notNull(),
        shom: varchar("shom", { length: 5 }).notNull(),
        xufton: varchar("xufton", { length: 5 }).notNull(),
        updatedDate: bigint("updated_date", { mode: "number" }).notNull(),
    },
    (table) => [uniqueIndex("prayer_times_city_key").on(table.city), index("idx_prayer_times_region_date").on(table.city)],
);
