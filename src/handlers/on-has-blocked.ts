import { Context, Filter } from "grammy";
import { saveUser } from "../services/save-user";
import { sendErrorLog } from "../services/log";
import { changeStatus } from "../services/deactivator";

export async function onHasBlocked(ctx: Filter<Context, "my_chat_member">) {
    try {
        if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
            const replyText = "Bu bot faqat shaxsiy chatda ishlaydi!";
            await ctx.reply(replyText, { parse_mode: "Markdown" });
            return;
        }

        const [user] = await saveUser(ctx);

        if (ctx.myChatMember.new_chat_member.status === "kicked") {
            await changeStatus(ctx, "has_blocked");
        } else if (ctx.myChatMember.new_chat_member.status === "member") {
            const status = user.language && user.city && user.time ? "active" : "new";
            await changeStatus(ctx, status);
        } else {
            await sendErrorLog({ event: "Foydalanuvchi statusi o'zgarmadi", ctx, error: new Error("Foydalanuvchi statusi o'zgarmadi") });
        }
    } catch (error) {
        await sendErrorLog({ event: "Foydalanuvchi bloklanganda", error, ctx });
    }
}
