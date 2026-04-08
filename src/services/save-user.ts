import { eq } from "drizzle-orm/sql/expressions/conditions";
import { ADMIN_CHAT } from "../utils/constants";
import { SaveUserData, Status } from "../utils/types";
import { sendErrorLog } from "./log";
import { User } from "../utils/types";
import { ptu } from "../db/schema";
import { CTX } from "../utils/types";
import { bot } from "../bot";
import { db } from "../db";

type PrayerTimeUserSelect = typeof ptu.$inferSelect;
type PrayerTimeUserInsert = typeof ptu.$inferInsert;

function mapDbUserToUser(row: PrayerTimeUserSelect): User {
    return {
        id: row.id,
        tg_id: row.tg_id ?? "",
        first_name: row.first_name ?? "",
        last_name: row.last_name ?? null,
        username: row.username ?? null,
        city: row.city ?? undefined,
        time: row.time ?? undefined,
        language: row.language ?? undefined,
        status: row.status as Status,
    };
}

export function userLink(user: User): string {
    const fullName = `${user.first_name || "Noma'lum"} ${user.last_name || ""}`;
    return user.username ? `<a href="tg://resolve?domain=${user.username}">${fullName}</a>` : `<a href="tg://user?id=${user.tg_id}">${fullName}</a>`;
}

export function groupLink(chat: { id: number; title?: string; username?: string | null }): string {
    const name = chat.title || "Noma'lum";
    return chat.username ? `<a href="https://t.me/${chat.username}">${name}</a>` : name;
}

export async function saveUser(ctx: CTX, data?: SaveUserData): Promise<User[]> {
    const user = ctx.from;
    if (!user) return [];

    const userData: User = {
        tg_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
    };

    if (data && data.language) userData.language = data.language;
    if (data && data.city) userData.city = data.city;
    if (data && (typeof data.time === "number" || typeof data.time === "string")) userData.time = data.time;
    if (data && data.status) userData.status = data.status;

    if (data && data.language && data.city && data.time && data?.status === "new") {
        userData.status = "active";
    }

    try {
        const [existingUser] = await db
            .select()
            .from(ptu)
            .where(eq(ptu.tg_id, String(userData.tg_id)))
            .limit(1);

        if (!existingUser) {
            const utm = data?.utm || "Xudo biladi";
            const username = user.username ? `@${user.username}` : "Noma'lum";
            const userlink = userLink(userData);
            const msg =
                `🆕 Yangi foydalanuvchi:\n\n👤 Ism: ${userlink}\n🔗 Username: ${username}\n` +
                `🆔 ID: <code>${user.id}</code>\n🚪 Qayerdan kelgan: ${utm}\n🤖 Bot: @bugungi_namoz_bot`;
            await bot.api.sendMessage(ADMIN_CHAT, msg, { parse_mode: "HTML" });
        }

        const upsertedData = await db
            .insert(ptu)
            .values(userData as PrayerTimeUserInsert)
            .onConflictDoUpdate({ target: ptu.tg_id, set: userData as PrayerTimeUserInsert })
            .returning();

        return upsertedData.map(mapDbUserToUser);
    } catch (error) {
        await sendErrorLog({ event: "User saqlashda", error, ctx });
        return [];
    }
}
