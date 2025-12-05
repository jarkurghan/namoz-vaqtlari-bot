export const makeMessage = (language, userTime) => {
	return (
		`${language == 2 ? userTime.date_text_uz : userTime.date_text_cyrl}\n\n` +
		`${language == 2 ? 'Tong' : 'Тонг'}: <b>${userTime.tong}</b>\n` +
		`${language == 2 ? 'Quyosh' : 'Қуёш'}: <b>${userTime.quyosh}</b>\n` +
		`${language == 2 ? 'Pеshin' : 'Пешин'}: <b>${userTime.peshin}</b>\n` +
		`${language == 2 ? 'Asr' : 'Аср'}: <b>${userTime.asr}</b>\n` +
		`${language == 2 ? 'Shom' : 'Шом'}: <b>${userTime.shom}</b>\n` +
		`${language == 2 ? 'Xufton' : 'Хуфтон'}: <b>${userTime.xufton}</b>\n`
	);
};

export async function deactivateService(supabase, tg_id) {
	try {
		const { error } = await supabase.from('prayer_time_users').upsert({ tg_id, is_active: false }, { onConflict: 'tg_id' }).select('*');
		if (error) console.error(error);
		else console.log('deactivated service for', tg_id);
	} catch (error) {
		console.error(error);
	}
}

export const cronJob = async (bot, supabase, index) => {
	const { data: users, error } = await supabase.from('prayer_time_users').select('*').eq('time', index).eq('is_active', true);
	const { data: times, error1 } = await supabase.from('prayer_times').select('*');

	if (error || error1) return console.log(error);

	for (let i = 0; i < users.length; i++) {
		try {
			const userTime = times.find((e) => e.city === users[i].city);
			const message = makeMessage(users[i].language, userTime);
			await bot.api.sendMessage(users[i].tg_id, message, { parse_mode: 'HTML' });
		} catch (error) {
			if (error.message === "Call to 'sendMessage' failed! (403: Forbidden: bot was blocked by the user)")
				await deactivateService(supabase, users[i].tg_id);
			else console.error(error);
		}
	}

	console.log('sended ✅');
	return;
};
