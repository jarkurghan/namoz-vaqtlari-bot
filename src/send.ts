import { bot } from './bot';
import { sendLog } from './log';
import { supabase } from './supabase';
import { PrayerUser } from './types';
import { UserTimeData } from './types';

export const makeMessage = (language: number, userTime: UserTimeData): string => {
	const isLatn = language == 2;
	return (
		`${isLatn ? userTime.date_text_uz : userTime.date_text_cyrl}\n\n` +
		`${isLatn ? 'Tong' : 'Тонг'}: <b>${userTime.tong}</b>\n` +
		`${isLatn ? 'Quyosh' : 'Қуёш'}: <b>${userTime.quyosh}</b>\n` +
		`${isLatn ? 'Pеshin' : 'Пешин'}: <b>${userTime.peshin}</b>\n` +
		`${isLatn ? 'Asr' : 'Аср'}: <b>${userTime.asr}</b>\n` +
		`${isLatn ? 'Shom' : 'Шом'}: <b>${userTime.shom}</b>\n` +
		`${isLatn ? 'Xufton' : 'Хуфтон'}: <b>${userTime.xufton}</b>\n`
	);
};

export async function deactivateService(tg_id: number | string): Promise<void> {
	try {
		const { error } = await supabase.from('prayer_time_users').upsert({ tg_id, is_active: false }, { onConflict: 'tg_id' }).select('*');

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
	const { data: users, error } = await supabase.from('prayer_time_users').select('*').eq('time', index).eq('is_active', true);

	const { data: times, error: error1 } = await supabase.from('prayer_times').select('*');

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
				await bot.api.sendMessage(user.tg_id, message, { parse_mode: 'HTML' });
				counter++;
			} else {
				await sendLog(`❗️ Yuborish vaqti topilmadi\n\n: ${JSON.stringify(user, null, 2)}`);
			}
		} catch (error: any) {
			const errorMsg = error.message || '';
			if (errorMsg.includes('bot was blocked by the user') || errorMsg.includes('user is deactivated')) {
				await deactivateService(user.tg_id);
			} else {
				await sendLog(`❗️ Xabar yuborishda xato: ${errorMsg}`);
			}
		}
	}

	await sendLog(`✅ Namoz vaqtlari yuborildi\n\n🕐 Yuborishlar: ${counter}\n💣 Xato: ${users.length - counter}`);
};
