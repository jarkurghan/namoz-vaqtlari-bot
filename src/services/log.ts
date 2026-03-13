import { LOG_CHAT } from "../utils/constants";
import { CTX, LogOptions } from "../utils/types";
import { bot } from "../bot";

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
