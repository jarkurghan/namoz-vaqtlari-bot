import { bot } from "./bot";
import { sendLog } from "./log";
import { supabase } from "./supabase";
import { PrayerUser } from "./types";
import { UserTimeData } from "./types";

export const makeMessage = (language: number, userTime: UserTimeData): string => {
	const isLatn = language == 2;
	return isLatn 
		? "⏳ islom.uz saytidagi texnik o'zgarishlar sabab bot bir necha kun ishlamaydi."
		: "⏳ islom.uz сайтидаги техник ўзгаришлар сабаб бот бир неча кун ишламайди.";

	const isRamadan = userTime.date_text_uz.includes("Ramazon");

	const dateText = `${isLatn ? userTime.date_text_uz : userTime.date_text_cyrl}\n\n`;
	const fajrText = isRamadan
		? `${isLatn ? "Tong (Saharlik)" : "Тонг (Саҳарлик)"}: <b>${userTime.tong}</b>\n`
		: `${isLatn ? "Tong" : "Тонг"}: <b>${userTime.tong}</b>\n`;
	const sunriseText = `${isLatn ? "Quyosh" : "Қуёш"}: <b>${userTime.quyosh}</b>\n`;
	const dhuhrText = `${isLatn ? "Pеshin" : "Пешин"}: <b>${userTime.peshin}</b>\n`;
	const asrText = `${isLatn ? "Asr" : "Аср"}: <b>${userTime.asr}</b>\n`;
	const maghribText = isRamadan
		? `${isLatn ? "Shom (Iftor)" : "Шом (Ифтор)"}: <b>${userTime.shom}</b>\n`
		: `${isLatn ? "Shom" : "Шом"}: <b>${userTime.shom}</b>\n`;
	const ishaText = `${isLatn ? "Xufton" : "Хуфтон"}: <b>${userTime.xufton}</b>`;
	const duaText = isRamadan
		? isLatn
			? `<i>\n\nSaharlik duosi:\n` +
			  `«Navaytu an asuma savma shahri Ramazona minal fajri ilal mag‘ribi, xolisan lillahi ta'ala. Allohu akbar»` +
			  `\n\nOg‘iz ochish duosi:\n` +
			  `«Allohumma laka sumtu va bika amantu va 'alayka tavakkaltu va 'ala rizqika aftortu. ` +
			  `Fag‘fir li ya G‘offaru ma qoddamtu va ma axxortu».</i>`
			: `<i>\n\nСаҳарлик дуоси:\n` +
			  `«Навайту ан асума совма шаҳри рамазона минал фажри илал мағриби, холисан лиллаҳи таъала Аллоҳу акбар».` +
			  `\n\nОғиз очиш дуоси:\n` +
			  `«Аллоҳумма лака сумту ва бика аманту ва ъалайка таваккалту ва ъалаа ризқика афторту. ` +
			  `Фағфирли Я Ғоффару ма қоддамту ва ма аххорту».</i>`
		: "";

	return dateText + fajrText + sunriseText + dhuhrText + asrText + maghribText + ishaText + duaText;
};

export async function deactivateService(tg_id: number | string): Promise<void> {
	try {
		const { error } = await supabase.from("prayer_time_users").upsert({ tg_id, is_active: false }, { onConflict: "tg_id" }).select("*");

		if (error) {
			await sendLog(`❗️ Xizmatni o'chirib bo'lmadi:\n\n👤 User ID: ${tg_id}\n💣 Xato: ${error.message}`);
		} else {
			await sendLog(`⚰️ Foydalanuvchi ${tg_id} uchun xizmat o'chirildi`);
		}
	} catch (error) {
		const errorMsg = `❗️ Xizmatni o'chirish jarayonida xatolik yuz berdi:\n\n👤 User ID: ${tg_id}\n💣 Xato: `;
		if (error instanceof Error) {
			await sendLog(`${errorMsg}${error.message}`);
		} else {
			await sendLog(`${errorMsg}${error}`);
		}
	}
}

export const cronJob = async (index: number): Promise<void> => {
	const { data: users, error } = await supabase.from("prayer_time_users").select("*").eq("time", index).eq("is_active", true);

	const { data: times, error: error1 } = await supabase.from("prayer_times").select("*");

	if (error) {
		await sendLog(`❗️ prayer_time_users table'ni o'qib bo'lmadi: ${error.message}`);
		return;
	}

	if (error1) {
		await sendLog(`❗️ prayer_times table'ni o'qib bo'lmadi: ${error1.message}`);
		return;
	}

	const typedUsers = users as PrayerUser[];
	const typedTimes = times as UserTimeData[];

	let counter = 0;
	for (const user of typedUsers) {
		try {
			const userTime = typedTimes.find((e) => e.city === user.city);

			if (userTime) {
				const message = makeMessage(user.language, userTime);
				await bot.api.sendMessage(user.tg_id, message, { parse_mode: "HTML" });
				counter++;
			} else {
				await sendLog(`❗️ Yuborish vaqti topilmadi\n\n: ${JSON.stringify(user, null, 2)}`);
			}
		} catch (error: any) {
			const errorMsg = error.message || "";
			if (errorMsg.includes("bot was blocked by the user") || errorMsg.includes("user is deactivated")) {
				await deactivateService(user.tg_id);
			} else {
				await sendLog(`❗️ Xabar yuborishda xato: ${errorMsg}`);
			}
		}
	}

	// await sendLog(`✅ Namoz vaqtlari yuborildi\n\n🕐 Yuborishlar: ${counter}\n💣 Xato: ${users.length - counter}`);
};
