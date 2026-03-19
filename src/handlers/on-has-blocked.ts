import { Context, Filter } from "grammy";
import { saveUser, userLink } from "../services/save-user";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { ptu } from "../db/schema";
import { db } from "../db";
import { sendLog } from "../services/log";
import { User } from "../utils/types";

export async function onHasBlocked(ctx: Filter<Context, "my_chat_member">) {
    if (ctx.chat.type !== "private") return;

    const [user] = await saveUser(ctx);

    const userData: User = {
        tg_id: Number(user.id),
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
    };

    if (ctx.myChatMember.new_chat_member.status === "kicked") {
        const condition = eq(ptu.tg_id, String(user.tg_id));
        await db.update(ptu).set({ status: "has_blocked" }).where(condition);

        sendLog(`⚰️ Foydalanuvchi ${userLink(userData)} uchun status o'zgartirildi: has_blocked`, { parse_mode: "HTML" });
    } else if (ctx.myChatMember.new_chat_member.status === "member") {
        const condition = eq(ptu.tg_id, String(user.tg_id));
        const status = user.language && user.city && user.time ? "active" : "new";
        await db.update(ptu).set({ status }).where(condition);

        sendLog(`⚰️ Foydalanuvchi ${userLink(userData)} uchun status o'zgartirildi: ${status}`, { parse_mode: "HTML" });
    } else {
        console.log(ctx.myChatMember.new_chat_member);
    }
}
