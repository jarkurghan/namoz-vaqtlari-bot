import data from '../data/data.json';

export const cronJob = async (bot, supabase, index) => {
	const { data: users, error } = await supabase.from('users_namoz_vaqtlari_bot').select('*').eq('time', index);

	if (error) return console.log(error);

	for (let i = 0; i < users.length; i++) {
		try {
			const message =
				`${data.date[users[i].language]}\n\n` +
				`${users[i].language == 2 ? 'Tong' : 'Тонг'}: ${data.prayerTimes[users[i].city][0]}\n` +
				`${users[i].language == 2 ? 'Quyosh' : 'Қуёш'}: ${data.prayerTimes[users[i].city][1]}\n` +
				`${users[i].language == 2 ? 'Pеshin' : 'Пешин'}: ${data.prayerTimes[users[i].city][2]}\n` +
				`${users[i].language == 2 ? 'Asr' : 'Аср'}: ${data.prayerTimes[users[i].city][3]}\n` +
				`${users[i].language == 2 ? 'Shom' : 'Шом'}: ${data.prayerTimes[users[i].city][4]}\n` +
				`${users[i].language == 2 ? 'Xufton' : 'Хуфтон'}: ${data.prayerTimes[users[i].city][5]}\n`;

			await bot.api.sendMessage(users[i].tg_id, message);
		} catch (error) {
			console.log(error);
		}
	}

	console.log('sended ✅');
	return;
};
