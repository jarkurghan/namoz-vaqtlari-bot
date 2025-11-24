import * as cheerio from 'cheerio';
import regions from '../data/cities.json';
import parser from '../data/parser.json';
import axios from 'axios';
import fs from 'node:fs';

type PrayerTimesData = {
	date: { '1': string; '2': string };
	prayerTimes: Record<string, string[]>;
};

const TARGET_URL = 'https://islom.uz';
type HijriMonth =
	| 'жумадис сони'
	| 'ражаб'
	| 'шаъбон'
	| 'Рамазон'
	| 'шаввол'
	| 'зулқаъда'
	| 'зулҳижжа'
	| 'муҳаррам'
	| 'сафар'
	| 'рабиъул аввал'
	| 'рабиъус сони'
	| 'жумадул аввал'
	| '';
type Month =
	| 'январь'
	| 'февраль'
	| 'март'
	| 'апрель'
	| 'май'
	| 'июнь'
	| 'июль'
	| 'август'
	| 'сентябрь'
	| 'октябрь'
	| 'ноябрь'
	| 'декабрь'
	| '';
type Weekday = 'якшанба' | 'душанба' | 'сешанба' | 'чоршанба' | 'пайшанба' | 'жума' | 'шанба' | '';
const parseDate = (dateStr: string) => {
	const parts = dateStr.split('|').map((part) => part.trim());

	const hijriDate = parts[0];
	const gregorianDate = parts[1];

	const hijriMatch = hijriDate.match(/(\d+)\s+йил\s+(\d+)\s+(.+)/i);
	const hijri = {
		year: parseInt(hijriMatch ? hijriMatch[1] : '', 10),
		day: parseInt(hijriMatch ? hijriMatch[2] : '', 10),
		monthName: hijriMatch ? (hijriMatch[3] as HijriMonth) : '',
	};

	const gregorianMatch = gregorianDate.match(/(\d+)\s+йил\s+(\d+)\s+(\S+),\s*(\S+)/i);
	const gregorian = {
		year: parseInt(gregorianMatch ? gregorianMatch[1] : '', 10),
		day: parseInt(gregorianMatch ? gregorianMatch[2] : '', 10),
		monthName: gregorianMatch ? (gregorianMatch[3] as Month) : '',
		weekday: gregorianMatch ? (gregorianMatch[4] as Weekday) : '',
	};

	return {
		1:
			`${parser['1'][gregorian.weekday]}\n` +
			`${gregorian.day}-${parser['1'][gregorian.monthName].toLowerCase()} ${gregorian.year}\n` +
			`${parser['1'][hijri.monthName]} ${hijri.day}, ${hijri.year}`,
		2:
			`${parser['2'][gregorian.weekday]}\n` +
			`${gregorian.day}-${parser['2'][gregorian.monthName].toLowerCase()} ${gregorian.year}\n` +
			`${parser['2'][hijri.monthName]} ${hijri.day}, ${hijri.year}`,
	};
};


async function handler(cities: string[], month: number | string) {
	try {
		const { data: home } = await axios.get(TARGET_URL);
		const $home = cheerio.load(home);

		const dateClassName = '.date_time';
		const dateElement = $home(dateClassName);
		const date = parseDate(dateElement.text().trim());
		const prayerTimes: Record<string, string[]> = {};

		for (let i = 0; i < cities.length; i++) {
			const { data: table } = await axios.get(TARGET_URL + '/vaqtlar/' + cities[i] + '/' + month);
			const $table = cheerio.load(table);

			const rowClassName = 'tr.p_day.bugun > td';
			const nowTimes: string[] = [];
			const tds = $table(rowClassName);
			tds.slice(3).each((index, element) => {
				const $element = $table(element);
				const timeText = $element.text().trim();
				nowTimes.push(timeText);
			});

			prayerTimes[cities[i]] = nowTimes;
		}

		await fs.promises.writeFile('./src/data/data.json', JSON.stringify({ date, prayerTimes }, null, 4), 'utf-8');
		return;
	} catch (error) {
		console.error(error);
	}
}

export async function getData() {
	const nowTashkent = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
	const month = nowTashkent.slice(0, nowTashkent.indexOf('/'));
	const cities = regions.map((e) => e.id);
	await handler(cities, month);

	console.log('noted ✅');
	return;
}
