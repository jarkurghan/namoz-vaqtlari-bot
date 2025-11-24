import { Bot, CallbackQueryContext, CommandContext, Context, InlineKeyboard, webhookCallback } from 'grammy';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jobs } from './scheduler/send.js';
import regions from './data/cities.json';
import './scheduler/get-data.js';

interface Env {
	BOT_TOKEN?: string;
	SUPABASE_URL?: string;
	SUPABASE_KEY?: string;
}

export interface User {
	id?: number;
	tg_id: string | number;
	first_name: string;
	last_name: string | null;
	username: string | null;
	city?: number | string;
	time?: number | string;
	language?: number | string;
}

type st = number | string | undefined;

async function saveUser(
	supabase: SupabaseClient<any, 'public', 'public', any, any>,
	ctx: CommandContext<Context> | CallbackQueryContext<Context>,
	data?: { city?: st; time?: st; language?: st }
): Promise<User[]> {
	const user = ctx.from;
	if (!user) return [];

	const userData: User = {
		tg_id: user.id,
		first_name: user.first_name,
		last_name: user.last_name || null,
		username: user.username || null,
	};

	if (data && data.language) userData.language = data.language;
	if (data && data.city) userData.city = data.city;
	if (data && data.time) userData.time = data.time;

	try {
		const { data: upsertedData, error } = await supabase
			.from('users_namoz_vaqtlari_bot')
			.upsert(userData, { onConflict: 'tg_id' })
			.select('*');

		if (error) console.error('Supabasega saqlashda xato:', error);

		return (upsertedData as User[]) || [];
	} catch (err) {
		console.error(err);
		return [];
	}
}

function getTimeKeyboard() {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < 24; i++) {
		const hour = i.toString().padStart(2, '0');
		keyboard.text(`${hour}:00`, `time_${hour}`);
		if ((i + 1) % 4 === 0) keyboard.row();
	}

	return keyboard;
}

function getRegionKeyboard(lang: number) {
	const keyboards = [];
	const pageSize = 12;
	const pageCount = Math.ceil(regions.length / pageSize);

	for (let page = 0; page < pageCount; page++) {
		const keyboard = new InlineKeyboard();
		const start = page * pageSize;
		const end = start + pageSize;

		for (let i = start; i < end && regions[i]; i += 2) {
			if (regions[i + 1])
				keyboard
					.text(lang === 2 ? regions[i].name_2 : regions[i].name_1, `region_${regions[i].id}`)
					.text(lang === 2 ? regions[i + 1].name_2 : regions[i + 1].name_1, `region_${regions[i + 1].id}`)
					.row();
			else keyboard.text(lang === 2 ? regions[i].name_2 : regions[i].name_1, `region_${regions[i].id}`).row();
		}

		if (page === 0) keyboard.text(lang === 2 ? 'Keyingi' : 'Кейинги', `list_${page + 1}`).row();
		else if (page === pageCount - 1) keyboard.text(lang === 2 ? 'Oldingi' : 'Олдинги', `list_${page - 1}`).row();
		else
			keyboard
				.text(lang === 2 ? 'Oldingi' : 'Олдинги', `list_${page - 1}`)
				.text(lang === 2 ? 'Keyingi' : 'Кейинги', `list_${page + 1}`)
				.row();

		keyboards.push({ reply_markup: keyboard });
	}

	return keyboards;
}

function getSettingsKeyboard(lang: number) {
	const keyboard = new InlineKeyboard();
	keyboard.text(lang === 1 ? 'Тилни ўзгартириш' : "Tilni o'zgartirish", `language`).row();
	keyboard.text(lang === 1 ? 'Ҳудудни ўзгартириш' : "Hududni o'zgartirish", `list_0`).row();
	keyboard.text(lang === 1 ? 'Юбориш вақти' : 'Yuborish vaqti', `vaqt`).row();
	return { reply_markup: keyboard };
}

function getSettingsMessage(user: User) {
	const city = regions.find((e) => e.id == user.city) as { id: string; name_1: string; name_2: string };
	const hour = (user.time as number).toString().padStart(2, '0');
	return user.language === 2
		? `Hozirgi sozlamalar:\n\n` + 'Til: 🇺🇿 Oʻzbekcha\n' + `Hudud: ${city.name_2}\n` + `Tarqatma vaqti: ${hour}:00`
		: 'Ҳозирги созламалар:\n\n' + 'Тил: 🇺🇿 Ўзбекча\n' + `Ҳудуд: ${city.name_1}\n` + `Тарқатма вақти: ${hour}:00`;
}

const RESPONSES = {
	SELECT_LANG: {
		MESSAGE: 'Iltimos, tilni tanlang!\nИлтимос, тилни танланг:',
		MARKS: { reply_markup: new InlineKeyboard().text('🇺🇿 Oʻzbekcha', 'lang_2').text('🇺🇿 Ўзбекча', 'lang_1') },
	},
	SELECT_TIME: {
		MESSAGE: {
			2: 'Kunlik namoz vaqtlari qaysi vaqtda yuborilishini xohlaysiz?',
			1: 'Кунлик намоз вақтлари қайси вақтда юборилишини хоҳлайсиз?',
		},
		MARKS: { reply_markup: getTimeKeyboard() },
	},
	SELECT_REGION: {
		MESSAGE: { 2: 'Hududni tanlang', 1: 'Ҳудудни танланг' },
		MARKS: { 2: getRegionKeyboard(2), 1: getRegionKeyboard(1) },
	},
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const BOT_TOKEN = env.BOT_TOKEN;
		const SUPABASE_URL = env.SUPABASE_URL;
		const SUPABASE_KEY = env.SUPABASE_KEY;

		if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) return new Response('Bot not working!', { status: 400 });

		const bot = new Bot(BOT_TOKEN);
		const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

		jobs(bot, supabase);

		bot.command('start', async (ctx) => {
			const [user]: User[] = await saveUser(supabase, ctx);

			if (!user.language) await ctx.reply(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
			else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.reply(RESPONSES.SELECT_REGION.MESSAGE[lang], RESPONSES.SELECT_REGION.MARKS[lang][0]);
				} else if (!user.time) {
					await ctx.reply(RESPONSES.SELECT_TIME.MESSAGE[lang], RESPONSES.SELECT_TIME.MARKS);
				} else {
					await ctx.reply(getSettingsMessage(user), getSettingsKeyboard(lang));
				}
			}
		});

		bot.callbackQuery(/lang_(2|1)/, async (ctx) => {
			const language = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, { language });

			if (!user.language) await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
			else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[lang], RESPONSES.SELECT_REGION.MARKS[lang][0]);
				} else if (!user.time) {
					await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[lang], RESPONSES.SELECT_TIME.MARKS);
				} else {
					await ctx.editMessageText(getSettingsMessage(user), getSettingsKeyboard(lang));
				}
			}

			await ctx.answerCallbackQuery({ text: language === '2' ? 'Lotincha tanlandi' : 'Кириллча танланди' });
		});

		bot.callbackQuery(/region_(\d+)/, async (ctx) => {
			const city = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, { city });

			if (!user.language) await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
			else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[lang], RESPONSES.SELECT_REGION.MARKS[lang][0]);
				} else if (!user.time) {
					await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[lang], RESPONSES.SELECT_TIME.MARKS);
				} else {
					await ctx.editMessageText(getSettingsMessage(user), getSettingsKeyboard(lang));
				}
			}

			if (user.language) {
				const cityname = regions.find((e) => e.id == city);
				const text = user.language == 2 ? `Hudud tanlandi: ${cityname?.name_2}` : `Ҳудуд танланди: ${cityname?.name_1}`;
				await ctx.answerCallbackQuery({ text });
			}
		});

		bot.callbackQuery(/list_(\d+)/, async (ctx) => {
			const index = Number(ctx.callbackQuery.data.split('_')[1]);

			const [user] = await saveUser(supabase, ctx);

			const lang = Number(user.language) === 2 ? 2 : 1;
			const keyboards = RESPONSES.SELECT_REGION.MARKS[lang];
			const keyboard = Array.isArray(keyboards) ? keyboards[index] : keyboards;

			await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[lang], keyboard);
		});

		bot.callbackQuery(/vaqt/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx);
			const lang = Number(user.language) === 2 ? 2 : 1;

			await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[lang], RESPONSES.SELECT_TIME.MARKS);
		});

		bot.callbackQuery(/language/, async (ctx) => {
			await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
		});

		bot.callbackQuery(/time_(\d+)/, async (ctx) => {
			const time = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, { time });

			if (!user.language) await ctx.editMessageText(RESPONSES.SELECT_LANG.MESSAGE, RESPONSES.SELECT_LANG.MARKS);
			else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.editMessageText(RESPONSES.SELECT_REGION.MESSAGE[lang], RESPONSES.SELECT_REGION.MARKS[lang][0]);
				} else if (!user.time) {
					await ctx.editMessageText(RESPONSES.SELECT_TIME.MESSAGE[lang], RESPONSES.SELECT_TIME.MARKS);
				} else {
					await ctx.editMessageText(getSettingsMessage(user), getSettingsKeyboard(lang));
				}
			}

			if (user.language) {
				const hourStr = user.time !== undefined && user.time !== null ? String(user.time).padStart(2, '0') : '00';
				const hour = hourStr + ':00';
				await ctx.answerCallbackQuery({ text: user.language == 2 ? `Vaqt tanlandi: ${hour}` : `Вақт танланди: ${hour}` });
			}
		});

		if (request.method !== 'POST') return new Response('Hello world');

		return webhookCallback(bot, 'cloudflare-mod')(request);
	},
} satisfies ExportedHandler<Env>;
