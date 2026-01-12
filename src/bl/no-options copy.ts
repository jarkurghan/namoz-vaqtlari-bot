import { SupabaseClient } from '@supabase/supabase-js';
import { Api, Bot, Context, InlineKeyboard, RawApi } from 'grammy';

// Massivni bo'laklarga bo'lish (Telegram limitlari uchun)
const chunk = <T>(array: T[], size: number): T[][] => {
	return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, i * size + size));
};

export async function sendOneTime(supabase: SupabaseClient, bot: Bot<Context, Api<RawApi>>) {
	const { data, error } = await supabase.from('prayer_time_users').select('*').eq('is_active', true);

	if (error || !data) return console.error('Supabase error:', error);

	const targets = data.filter((u) => !u.time || !u.city || !u.language);

	const scs: number[] = [];
	const ers: number[] = [];

	// 3. 30 tadan bo'lib parallel yuborish
	const batches = chunk(targets, 30);

	for (const batch of batches) {
		await Promise.allSettled(
			batch.map(async (user) => {
				try {
					const lang = Number(user.language) || 2; // Default 2 (Lotin)
					const isCyrillic = lang === 1;

					// Xabar matni (shablonlar yordamida optimallashtirildi)
					const message = isCyrillic
						? `Ассалом алайкум! Ботдан тўлиқ фойдаланиш учун ${!user.language ? 'тил, ' : ''}${!user.city ? 'ҳудуд, ва ' : ''}${
								!user.time ? 'тарқатма вақти' : ''
						  }ни танлашингизни сўраймиз\n\n` +
						  `${!user.language ? '<b>тил</b> - мулоқот учун\n' : ''}` +
						  `${!user.city ? '<b>ҳудуд</b> - намоз вақтларини олиш\n' : ''}` +
						  `${!user.time ? '<b>тарқатма вақти</b> - вақтни созлаш\n' : ''}`
						: `Assalom alaykum! Botdan to'liq foydalanish uchun ${!user.language ? 'til, ' : ''}${!user.city ? 'hudud, va ' : ''}${
								!user.time ? 'tarqatma vaqti' : ''
						  }ni tanlashingizni so'raymiz\n\n` +
						  `${!user.language ? '<b>til</b> - muloqot uchun\n' : ''}` +
						  `${!user.city ? '<b>hudud</b> - namoz vaqtlarini olish\n' : ''}` +
						  `${!user.time ? '<b>tarqatma vaqti</b> - vaqtni sozlash\n' : ''}`;

					const keyboard = new InlineKeyboard();
					if (!user.language) {
						keyboard.text(isCyrillic ? 'Тилни танлаш' : 'Tilni tanlash', 'language');
					} else if (!user.city) {
						keyboard.text(isCyrillic ? 'Ҳудудни танлаш' : 'Hududni tanlash', 'vils');
					} else if (!user.time) {
						keyboard.text(isCyrillic ? 'Тарқатма вақтини танлаш' : 'Tarqatma vaqtini tanlash', 'vaqt');
					}

					await bot.api.sendMessage(user.tg_id, message, {
						reply_markup: keyboard,
						parse_mode: 'HTML',
					});

					scs.push(user.tg_id);
				} catch (err) {
					ers.push(user.tg_id);
					console.log(err);
				}
			})
		);

		// Telegram Flood Wait oldini olish va CPU vaqtini tejash uchun kichik pauza
		if (batches.length > 1) {
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	console.log('✅ Bajarildi');
	console.log(`Muvaffaqiyatli: ${scs.length}, Xato: ${ers.length}`);
}
