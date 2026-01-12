import { LOG_CHAT } from './constants';
import { LogOptions } from './types';
import { bot } from './bot';

export const sendLog = async (message: string, options?: LogOptions): Promise<void> => {
	try {
		const { parse_mode, reply_to_message_id } = options || { parse_mode: 'HTML' };
		if (reply_to_message_id) {
			await bot.api.sendMessage(LOG_CHAT, message, {
				parse_mode: parse_mode,
				reply_parameters: { message_id: reply_to_message_id },
			});
		} else {
			await bot.api.sendMessage(LOG_CHAT, message, {
				parse_mode: parse_mode,
			});
		}
	} catch (error) {
		console.error('System error:', error);
	}
};
