import { BOT_TOKEN } from "./utils/constants";
import { Bot, webhookCallback } from "grammy";
import { registerVilCallback } from "./handlers/select-vil-callback";
import { registerRegCallback } from "./handlers/select-reg-callback";
import { registerLangCallback } from "./handlers/select-lang-callback";
import { registerVilsCallback } from "./handlers/register-vils-callback";
import { registerVaqtCallback } from "./handlers/register-vaqt-callback";
import { registerStartCommand } from "./handlers/register-start-command";
import { registerSettingsCallback } from "./handlers/action-settings-callback";
import { registerLanguageCallback } from "./handlers/register-language-callback";
import { registerSubscribeCallback } from "./handlers/select-subscribe-callback";
import { registerDashboardCallback } from "./handlers/register-dashboard-callback";
import { registerPrayertimeCallback } from "./handlers/action-prayertime-callback";
import { registerBroadcastCommand } from "./handlers/register-broadcast-command";
import { registerErrorHandler } from "./handlers/register-error-handler";
import { registerTimeCallback } from "./handlers/select-time-callback";
import { onHasBlocked } from "./handlers/on-has-blocked";
import { autoRetry } from "@grammyjs/auto-retry";

if (!BOT_TOKEN) throw new Error("BOT_TOKEN topilmadi!");
export const bot = new Bot(BOT_TOKEN);

bot.api.config.use(autoRetry());

bot.command("start", registerStartCommand);
bot.callbackQuery(/language/, registerLanguageCallback);
bot.callbackQuery(/lang_(2|1)/, registerLangCallback);
bot.callbackQuery(/vils/, registerVilsCallback);
bot.callbackQuery(/vil_(\d+)/, registerVilCallback);
bot.callbackQuery(/reg_(\d+)/, registerRegCallback);
bot.callbackQuery(/vaqt/, registerVaqtCallback);
bot.callbackQuery(/time_(\d+)/, registerTimeCallback);
bot.callbackQuery(/settings/, registerSettingsCallback);
bot.callbackQuery(/subscribe_(true|false)/, registerSubscribeCallback);
bot.callbackQuery(/dashboard/, registerDashboardCallback);
bot.callbackQuery(/prayertime/, registerPrayertimeCallback);
bot.hears("🕘 Bugungi namoz vaqtlari", registerPrayertimeCallback);
bot.hears("🕘 Бугунги намоз вақтлари", registerPrayertimeCallback);
bot.hears("⚙️ Sozlamalar", registerSettingsCallback);
bot.hears("⚙️ Созламалар", registerSettingsCallback);
bot.command("broadcast", registerBroadcastCommand);
bot.on("my_chat_member", onHasBlocked);
bot.catch(registerErrorHandler);

export const handleUpdate = webhookCallback(bot, "hono");

// export function startBot() {
//     return bot.start();
// }
