import { LOG_CHAT } from "./constants";
import { CTX, LogOptions } from "./types";
import { bot } from "./bot";

/** HTML parse_mode da < va > belgilari xatolik beradi — escape qilamiz */
function escapeForTelegramHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const sendLog = async (message: string, options?: LogOptions): Promise<void> => {
    try {
        const { parse_mode = "HTML", reply_to_message_id } = options || {};
        const safeMessage = parse_mode === "HTML" ? escapeForTelegramHtml(message) : message;
        if (reply_to_message_id) {
            await bot.api.sendMessage(LOG_CHAT, safeMessage, {
                parse_mode: parse_mode,
                reply_parameters: { message_id: reply_to_message_id },
            });
        } else {
            await bot.api.sendMessage(LOG_CHAT, safeMessage, {
                parse_mode: parse_mode,
            });
        }
    } catch (error) {
        console.error("System error:", error);
    }
};

export const dontDelete = async (ctx: CTX, error: unknown): Promise<void> => {
    try {
        const forwardedLog = await ctx.forwardMessage(LOG_CHAT);
        const reply_to_message_id = forwardedLog.message_id;

        const userInfo =
            `👤 Ism: ${ctx.chat?.first_name || "Noma'lum"} ${ctx.chat?.last_name || ""}\n` +
            `🔗 Username: ${ctx.chat?.username ? `@${ctx.chat?.username}` : "Noma'lum"}\n` +
            `🆔 ID: ${ctx.chat?.id}`;
        await bot.api.sendMessage(LOG_CHAT, userInfo, { reply_to_message_id });

        const errMsg = "Unable to delete message: " + (error instanceof Error ? error.message : error);
        await bot.api.sendMessage(LOG_CHAT, errMsg, { reply_to_message_id });
    } catch (error) {
        console.error("System error:", error);
    }
};
