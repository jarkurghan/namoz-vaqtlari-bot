export const cronJob = async (bot, supabase, index) => {
	const { data: users, error } = await supabase.from('users_namoz_vaqtlari_bot').select('*').eq('time', index).eq('is_active', true);
	const { data: times, error1 } = await supabase.from('prayer_times').select('*');

	if (error || error1) return console.log(error);

	for (let i = 0; i < users.length; i++) {
		try {
			const userTime = times.find((e) => e.city === users[i].city);
			const message =
				`${users[i].language == 2 ? userTime.date_text_uz : userTime.date_text_cyrl}\n\n` +
				`${users[i].language == 2 ? 'Tong' : 'Тонг'}: <b>${userTime.tong}</b>\n` +
				`${users[i].language == 2 ? 'Quyosh' : 'Қуёш'}: <b>${userTime.quyosh}</b>\n` +
				`${users[i].language == 2 ? 'Pеshin' : 'Пешин'}: <b>${userTime.peshin}</b>\n` +
				`${users[i].language == 2 ? 'Asr' : 'Аср'}: <b>${userTime.asr}</b>\n` +
				`${users[i].language == 2 ? 'Shom' : 'Шом'}: <b>${userTime.shom}</b>\n` +
				`${users[i].language == 2 ? 'Xufton' : 'Хуфтон'}: <b>${userTime.xufton}</b>\n`;

			await bot.api.sendMessage(users[i].tg_id, message, { parse_mode: 'HTML' });
		} catch (error) {
			console.log(error);
		}
	}

	console.log('sended ✅');
	return;
};
