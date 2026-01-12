import { SupabaseClient } from '@supabase/supabase-js';
import { Api, Bot, Context, InlineKeyboard, RawApi } from 'grammy';

export async function sendOneTime(supabase: SupabaseClient<any, 'public', 'public', any, any>, bot: Bot<Context, Api<RawApi>>) {
	const { data, error } = await supabase.from('prayer_time_users').select('*').eq('is_active', true);
	if (error) return console.error(error);

	const scs = [];
	const ers = [];
	for (let i = 0; i < data.length; i++) {
		if (!data[i].time || !data[i].city || !data[i].language) {
			try {
				const lang = Number(data[i].language);
				const message =
					lang === 1
						? 'Ассалом алайкум! Ботдан тўлиқ фойдаланиш учун' +
						  `${data[i].language ? '' : ' тил,'}` +
						  `${data[i].city ? '' : ' ҳудуд, ва'}` +
						  `${data[i].time ? '' : ' тарқатма вақти'}` +
						  'ни танлашингизни сўраймиз\n\n' +
						  `${data[i].language ? '' : '<b>тил</b> - мулоқот учун\n'}` +
						  `${data[i].city ? '' : '<b>ҳудуд</b> - қайси ҳудуд учун намоз вақтларини олиш\n'}` +
						  `${data[i].time ? '' : '<b>тарқатма вақти</b> - намоз вақтларини қайси вақтда олиш\n'}`
						: "Assalom alaykum! Botdan to'liq foydalanish uchun" +
						  `${data[i].language ? '' : ' til,'}` +
						  `${data[i].city ? '' : ' hudud, va'}` +
						  `${data[i].time ? '' : ' tarqatma vaqti'}` +
						  "ni tanlashingizni so'raymiz\n\n" +
						  `${data[i].language ? '' : '<b>til</b> - muloqot uchun\n'}` +
						  `${data[i].city ? '' : '<b>hudud</b> - qaysi hudud uchun namoz vaqtlarini olish\n'}` +
						  `${data[i].time ? '' : '<b>tarqatma vaqti</b> - namoz vaqtlarini qaysi vaqtda olish\n'}`;

				const langText = lang === 1 ? 'Тилни танлаш' : 'Tilni tanlash';
				const regionText = lang === 1 ? 'Ҳудудни танлаш' : 'Hududni tanlash';
				const timeText = lang === 1 ? 'Тарқатма вақтини танлаш' : 'Tarqatma vaqtini tanlash';

				const keyboard = new InlineKeyboard();
				if (!data[i].language) keyboard.text(langText, `language`).row();
				else if (!data[i].city) keyboard.text(regionText, `vils`).row();
				else if (!data[i].time) keyboard.text(timeText, `vaqt`).row();

				await bot.api.sendMessage(data[i].tg_id, message, { reply_markup: keyboard, parse_mode: 'HTML' });
				scs.push(data[i].tg_id);
			} catch (error) {
				ers.push(data[i].tg_id);
				console.error(error);
			}
		}
	}

	console.log('sended ✅');
	console.log('success:', scs);
	console.log('error:', ers);
	return;
}
