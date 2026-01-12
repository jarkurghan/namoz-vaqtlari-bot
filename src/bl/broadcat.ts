import { Bot, GrammyError, HttpError } from 'grammy';

const bot = new Bot('YOUR_BOT_TOKEN');
const ADMIN_ID = 11;

/**
 * Broadcast funksiyasi
 * @param userIds - Foydalanuvchilar ID ro'yxati
 * @param message - Yuborilishi kerak bo'lgan matn
 */
async function sendBroadcast(userIds: number[], message: string) {
	let successCount = 0;
	let failureCount = 0;

	for (const id of userIds) {
		try {
			// Xabarni yuborish
			await bot.api.sendMessage(id, message);
			successCount++;

			// Telegram limitlariga tushmaslik uchun:
			// Sekundiga ~30 ta xabar yuborish tavsiya etiladi.
			// 1000ms / 30 = 33ms. Biz xavfsizlik uchun 35-40ms kutamiz.
			await new Promise((resolve) => setTimeout(resolve, 40));
		} catch (error) {
			if (error instanceof GrammyError) {
				// Agar foydalanuvchi botni bloklagan bo'lsa
				if (error.description.includes('bot was blocked by the user')) {
					console.log(`User ${id} botni bloklagan.`);
				}
			} else if (error instanceof HttpError) {
				console.error("Telegram bilan bog'lanishda xato:", error);
			}
			failureCount++;
		}
	}

	return { successCount, failureCount };
}

// Bot buyrug'ini sozlash
bot.command('broadcast', async (ctx) => {
	// Faqat admin ishlata olishi uchun tekshiruv
	if (ctx.from?.id !== ADMIN_ID) return;

	const users = [123456, 7891011]; // DB dan olingan IDlar
	const text = 'Salom! Bu muhim xabar.';

	await ctx.reply('Broadcast boshlandi...');
	const result = await sendBroadcast(users, text);
	await ctx.reply(`Tayyor!\n✅ Yetkazildi: ${result.successCount}\n❌ Xatolik: ${result.failureCount}`);
});

bot.start();
