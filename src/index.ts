import { Api, Bot, CallbackQueryContext, CommandContext, RawApi } from 'grammy';
import { Context, InlineKeyboard, webhookCallback } from 'grammy';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { getData } from './scheduler/get-data.js';
import { cronJob, makeMessage } from './scheduler/send.js';
import { ParseMode } from '@grammyjs/types';
import regions from './data/cities.json';

interface Env {
	BOT_TOKEN?: string;
	SUPABASE_URL?: string;
	SUPABASE_KEY?: string;
	ADMIN_CHAT_ID?: string;
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
	is_active?: boolean;
}

type st = number | string | undefined;

async function saveUser(
	supabase: SupabaseClient<any, 'public', 'public', any, any>,
	ctx: CommandContext<Context> | CallbackQueryContext<Context>,
	bot: Bot<Context, Api<RawApi>>,
	ADMIN_CHAT_ID: string | number,
	data?: { city?: st; time?: st; language?: st; is_active?: boolean; utm?: string }
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
	if (data && (typeof data.time === 'number' || typeof data.time === 'string')) userData.time = data.time;
	if (data && typeof data.is_active === 'boolean') userData.is_active = data.is_active;

	try {
		const { data: existingUser } = await supabase.from('prayer_time_users').select('tg_id').eq('tg_id', userData.tg_id).maybeSingle();

		if (!existingUser) {
			const utm = data?.utm || '-';
			await bot.api.sendMessage(
				ADMIN_CHAT_ID,
				`🆕 Yangi foydalanuvchi:\n\n` +
					`👤 Ism: ${user.first_name || "Noma'lum"} ${user.last_name || ''}\n` +
					`🔗 Username: ${user.username ? `@${user.username}` : "Noma'lum"}\n` +
					`🆔 ID: ${user.id}\n` +
					`🚪 UTM Source: ${utm}\n` +
					`🤖 Bot: @bugungi_namoz_bot`
			);
		}

		const { data: upsertedData, error } = await supabase.from('prayer_time_users').upsert(userData, { onConflict: 'tg_id' }).select('*');

		if (error) console.error('Supabasega saqlashda xato:', error);

		return (upsertedData as User[]) || [];
	} catch (err) {
		console.error(err);
		return [];
	}
}

export const isActiveCity = async (supabase: SupabaseClient<any, 'public', 'public', any, any>, city: number): Promise<boolean> => {
	const currentTimestamp = new Date().getTime();

	const { data, error } = await supabase.from('prayer_times').select('updated_date').eq('city', city);
	if (error) {
		console.error(error);
		return false;
	}

	const cityTimestamp = new Date(data[0].updated_date).getTime();

	return 86400000 > currentTimestamp - cityTimestamp;
};

function getTimeKeyboard(lang: number) {
	const keyboard = new InlineKeyboard();

	for (let i = 1; i < 24; i++) {
		const hour = i.toString().padStart(2, '0');
		keyboard.text(`${hour}:00`, `time_${hour}`);
		if (i % 4 === 0) keyboard.row();
	}

	keyboard.row();
	keyboard.text(lang === 2 ? 'Ortga qaytish' : 'Ортга қайтиш', `settings`).row();

	return keyboard;
}

function getVilsKeyboard(lang: number) {
	const keyboard = new InlineKeyboard();
	const key = ('viloyat_' + lang) as 'viloyat_1' | 'viloyat_2';

	const viloyatlarMap = new Map<string, { [key]: string; viloyat_code: string }>();
	regions.forEach((item) => {
		if (!viloyatlarMap.has(item.viloyat_code)) {
			viloyatlarMap.set(item.viloyat_code, { [key]: item[key], viloyat_code: item.viloyat_code });
		}
	});
	const vil = Array.from(viloyatlarMap.values());

	for (let i = 0; i < vil.length; i++) {
		const button = keyboard.text(vil[i][key], `vil_${vil[i].viloyat_code}`);
		if (i % 2 !== 0 || i === vil.length - 1) button.row();
	}

	const backText = lang === 2 ? 'Ortga qaytish' : 'Ортга қайтиш';
	keyboard.text(backText, `settings`).row();

	return keyboard;
}

function getRegsKeyboard(lang: number, vil_code: number) {
	const keyboard = new InlineKeyboard();
	const key = lang === 2 ? 'name_2' : 'name_1';
	const regs = [...new Set(regions.filter((item) => item.viloyat_code === String(vil_code)))];

	for (let i = 0; i < regs.length; i++) {
		const button = keyboard.text(regs[i][key], `reg_${regs[i].id}`);
		if (i % 2 !== 0 || i === regs.length - 1) button.row();
	}

	const backText = lang === 2 ? 'Ortga qaytish' : 'Ортга қайтиш';
	keyboard.text(backText, `vils`).row();

	return keyboard;
}

function getSettingsKeyboard(lang: number, is_active: boolean) {
	const langText = lang === 1 ? 'Тилни ўзгартириш' : "Tilni o'zgartirish";
	const regionText = lang === 1 ? 'Ҳудудни ўзгартириш' : "Hududni o'zgartirish";
	const timeText = lang === 1 ? 'Юбориш вақтини ўзгартириш' : "Yuborish vaqtini o'zgartirish";
	const subText = lang === 1 ? (is_active ? 'Обунани тўхтатиш' : 'Обунани тиклаш') : is_active ? 'Obunani toʻxtatish' : 'Obunani tiklash';

	const keyboard = new InlineKeyboard();
	keyboard.text(langText, `language`).row();
	keyboard.text(regionText, `vils`).row();
	keyboard.text(timeText, `vaqt`).row();
	keyboard.text(subText, `subscribe_${!is_active}`).row();
	keyboard.text(lang === 2 ? 'Ortga qaytish' : 'Ортга қайтиш', `dashboard`).row();

	return keyboard;
}

async function getDashboardKeyboard(lang: number, city: number, supabase: SupabaseClient<any, 'public', 'public', any, any>) {
	const keyboard = new InlineKeyboard();
	if (await isActiveCity(supabase, city))
		keyboard.text(lang === 1 ? 'Бугунги намоз вақтлари' : 'Bugungi namoz vaqtlari', `prayertime`).row();
	keyboard.text(lang === 1 ? '⚙️ Созламалар' : '⚙️ Sozlamalar', `settings`).row();

	return keyboard;
}

async function getDashboardMessage(user: User, supabase: SupabaseClient<any, 'public', 'public', any, any>) {
	const city = regions.find((e) => e.id == user.city) as { id: string; name_1: string; name_2: string };
	const hour = (user.time as number).toString().padStart(2, '0');
	const is_active_city = await isActiveCity(supabase, Number(city.id));

	return user.language === 2
		? `${is_active_city ? 'Har kuni' : 'Ertadan boshlab har kuni'}` +
				` soat <b>${hour}:00</b>da sizga ${city.name_2} vaqti bo‘yicha kunlik namoz vaqtlari yuboriladi.` +
				`${user.is_active ? '' : '\n\nEslatma: Siz hozirda obunani toʻxtatgansiz, namoz vaqtlari yuborilmaydi.'}`
		: `${is_active_city ? 'Ҳар куни' : 'Эртадан бошлаб ҳар куни'}` +
				` соат <b>${hour}:00</b>да сизга ${city.name_1} вақти бўйича кунлик намоз вақтлари юборилади.` +
				`${user.is_active ? '' : '\n\nЭслатма: Сиз ҳозирда обунани тўхтатгансиз, намоз вақтлари юборилмайди.'}`;
}

function getSettingsMessage(user: User) {
	const city = regions.find((e) => e.id == user.city) as { id: string; name_1: string; name_2: string };
	const hour = (user.time as number).toString().padStart(2, '0');

	return user.language === 2
		? `Hozirgi sozlamalar:\n\n` +
				'Til: 🇺🇿 Oʻzbekcha\n' +
				`Hudud: ${city.name_2}\n` +
				`Tarqatma vaqti: ${hour}:00` +
				`${user.is_active ? '' : "\nTarqatma holati: O'chirilgan"}`
		: 'Ҳозирги созламалар:\n\n' +
				'Тил: 🇺🇿 Ўзбекча\n' +
				`Ҳудуд: ${city.name_1}\n` +
				`Тарқатма вақти: ${hour}:00` +
				`${user.is_active ? '' : '\nТарқатма ҳолати: Ўчирилган'}`;
}

const MESSAGES = {
	SELECT_LANG: {
		2: 'Iltimos, tilni tanlang!\nИлтимос, тилни танланг:',
		1: 'Iltimos, tilni tanlang!\nИлтимос, тилни танланг:',
	},
	SELECT_TIME: {
		2: 'Kunlik namoz vaqtlari qaysi vaqtda yuborilishini xohlaysiz?',
		1: 'Кунлик намоз вақтлари қайси вақтда юборилишини хоҳлайсиз?',
	},
	SELECT_REGION: {
		2: 'Hududni tanlang',
		1: 'Ҳудудни танланг',
	},
	SETTINGS: getSettingsMessage,
	DASHBOARD: getDashboardMessage,
};

type paramsType =
	| { key: 'lang'; lang?: number }
	| { key: 'time'; lang: number }
	| { key: 'vil'; lang: number }
	| { key: 'reg'; lang: number; vil: number }
	| { key: 'settings'; lang: number; is_active: boolean }
	| { key: 'dashboard'; lang: number; city: number; supabase: SupabaseClient<any, 'public', 'public', any, any> };

async function makeMarks(options: paramsType): Promise<{ reply_markup: InlineKeyboard; parse_mode: ParseMode }> {
	switch (options.key) {
		case 'lang':
			const back = options.lang === 2 ? 'Ortga qaytish' : options.lang === 1 ? 'Ортга қайтиш' : 'Ortga qaytish / Ортга қайтиш';
			const marks = new InlineKeyboard().text('🇺🇿 Oʻzbekcha', 'lang_2').text('🇺🇿 Ўзбекча', 'lang_1').row();
			marks.text(back, `settings`).row();
			return { reply_markup: marks, parse_mode: 'HTML' };
		case 'time':
			return { reply_markup: getTimeKeyboard(options.lang), parse_mode: 'HTML' };
		case 'vil':
			return { reply_markup: getVilsKeyboard(options.lang), parse_mode: 'HTML' };
		case 'reg':
			return { reply_markup: getRegsKeyboard(options.lang, options.vil), parse_mode: 'HTML' };
		case 'settings':
			return { reply_markup: getSettingsKeyboard(options.lang, options.is_active), parse_mode: 'HTML' };
		case 'dashboard':
			return { reply_markup: await getDashboardKeyboard(options.lang, options.city, options.supabase), parse_mode: 'HTML' };
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const BOT_TOKEN = env.BOT_TOKEN;
		const SUPABASE_URL = env.SUPABASE_URL;
		const SUPABASE_KEY = env.SUPABASE_KEY;
		const ADMIN_CHAT_ID = env.ADMIN_CHAT_ID;

		if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY || !ADMIN_CHAT_ID) return new Response('Bot not working!', { status: 400 });

		const bot = new Bot(BOT_TOKEN);
		const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

		bot.command('start', async (ctx) => {
			const payload = ctx.match;
			const utm = payload.slice(payload.indexOf('utm-') + 4);

			const [user]: User[] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID, { utm });

			if (!user.language) await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.reply(
						await MESSAGES.DASHBOARD(user, supabase),
						await makeMarks({ key: 'dashboard', lang, city: Number(user.city), supabase })
					);
				}
			}
		});

		bot.callbackQuery(/lang_(2|1)/, async (ctx) => {
			const language = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID, { language });

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.deleteMessage();
					await ctx.reply(
						await MESSAGES.DASHBOARD(user, supabase),
						await makeMarks({ key: 'dashboard', lang, city: Number(user.city), supabase })
					);
				}
			}

			await ctx.answerCallbackQuery({ text: language === '2' ? 'Lotincha tanlandi' : 'Кириллча танланди' });
		});

		bot.callbackQuery(/vils/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
			}
		});

		bot.callbackQuery(/vil_(\d+)/, async (ctx) => {
			const vil_code = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'reg', lang, vil: Number(vil_code) }));
			}
		});

		bot.callbackQuery(/reg_(\d+)/, async (ctx) => {
			const city = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID, { city });

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.deleteMessage();
					await ctx.reply(
						await MESSAGES.DASHBOARD(user, supabase),
						await makeMarks({ key: 'dashboard', lang, city: Number(user.city), supabase })
					);
				}
			}

			if (user.language) {
				const cityname = regions.find((e) => e.id == city);
				const text = user.language == 2 ? `Hudud tanlandi: ${cityname?.name_2}` : `Ҳудуд танланди: ${cityname?.name_1}`;
				await ctx.answerCallbackQuery({ text });
			}
		});

		bot.callbackQuery(/settings/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SETTINGS(user), await makeMarks({ key: 'settings', lang, is_active: Boolean(user.is_active) }));
				}
			}
		});

		bot.callbackQuery(/dashboard/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.deleteMessage();
					await ctx.reply(
						await MESSAGES.DASHBOARD(user, supabase),
						await makeMarks({ key: 'dashboard', lang, city: Number(user.city), supabase })
					);
				}
			}
		});

		bot.callbackQuery(/vaqt/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);
			const lang = Number(user.language) === 2 ? 2 : 1;
			await ctx.deleteMessage();
			await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
		});

		bot.callbackQuery(/language/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);
			const lang = Number(user.language) === 2 ? 2 : 1;
			await ctx.deleteMessage();
			await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang', lang }));
		});

		bot.callbackQuery(/time_(\d+)/, async (ctx) => {
			const time = ctx.callbackQuery.data.split('_')[1];

			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID, { time });

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.deleteMessage();
					await ctx.reply(
						await MESSAGES.DASHBOARD(user, supabase),
						await makeMarks({ key: 'dashboard', lang, city: Number(user.city), supabase })
					);
				}
			}

			if (user.language) {
				const hourStr = user.time !== undefined && user.time !== null ? String(user.time).padStart(2, '0') : '00';
				const hour = hourStr + ':00';
				await ctx.answerCallbackQuery({ text: user.language == 2 ? `Vaqt tanlandi: ${hour}` : `Вақт танланди: ${hour}` });
			}
		});

		bot.callbackQuery(/subscribe_(true|false)/, async (ctx) => {
			const is_active = ctx.callbackQuery.data.split('_')[1] === 'true';

			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID, { is_active });

			const lang = Number(user.language) === 2 ? 2 : 1;
			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SETTINGS(user), await makeMarks({ key: 'settings', lang, is_active: Boolean(user.is_active) }));
				}
			}

			const text = lang === 2 ? (is_active ? 'Obuna tiklandi' : "Obuna to'xtatildi") : is_active ? 'Обуна тикланди' : 'Обуна тўхтатилди';
			await ctx.answerCallbackQuery({ text });
		});

		bot.callbackQuery(/prayertime/, async (ctx) => {
			const [user] = await saveUser(supabase, ctx, bot, ADMIN_CHAT_ID);

			if (!user.language) {
				await ctx.deleteMessage();
				await ctx.reply(MESSAGES.SELECT_LANG[1], await makeMarks({ key: 'lang' }));
			} else {
				const lang = Number(user.language) === 2 ? 2 : 1;

				if (!user.city) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_REGION[lang], await makeMarks({ key: 'vil', lang }));
				} else if (!user.time) {
					await ctx.deleteMessage();
					await ctx.reply(MESSAGES.SELECT_TIME[lang], await makeMarks({ key: 'time', lang }));
				} else {
					const { data: userTime } = await supabase.from('prayer_times').select('*').eq('city', user.city);
					const message = makeMessage(lang, userTime?.[0]);
					await ctx.deleteMessage();
					await ctx.reply(message, { parse_mode: 'HTML' });
					await ctx.reply(
						await MESSAGES.DASHBOARD(user, supabase),
						await makeMarks({ key: 'dashboard', lang, city: Number(user.city), supabase })
					);
				}
			}
		});

		if (request.method !== 'POST') return new Response('Hello world');

		return webhookCallback(bot, 'cloudflare-mod')(request);
	},

	async scheduled(controller, env, ctx) {
		const BOT_TOKEN = env.BOT_TOKEN as string;
		const SUPABASE_URL = env.SUPABASE_URL as string;
		const SUPABASE_KEY = env.SUPABASE_KEY as string;

		const bot = new Bot(BOT_TOKEN);
		const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

		if (controller.cron === '0 0-18,20-23 * * *') {
			const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));
			await cronJob(bot, supabase, hour);
		} else if (controller.cron === '1-5 19 * * *') {
			const minute = new Date(controller.scheduledTime).getUTCMinutes();
			console.log('minute:', minute);

			await getData(supabase, minute - 1);
		} else {
			console.log('event: ', new Date());
		}
	},
} satisfies ExportedHandler<Env>;
