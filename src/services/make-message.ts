import { UserTimeData } from "../utils/types";

export const makeMessage = (language: number, userTime: UserTimeData): string => {
    const isLatn = language == 2;
    const isRamadan = userTime.date_text_uz.includes("Ramazon");

    const dateText = `${isLatn ? userTime.date_text_uz : userTime.date_text_cyrl}\n\n`;
    const fajrText = isRamadan
        ? `${isLatn ? "Tong (Saharlik)" : "Тонг (Саҳарлик)"}: <b>${userTime.tong}</b>\n`
        : `${isLatn ? "Tong" : "Тонг"}: <b>${userTime.tong}</b>\n`;
    const sunriseText = `${isLatn ? "Quyosh" : "Қуёш"}: <b>${userTime.quyosh}</b>\n`;
    const dhuhrText = `${isLatn ? "Pеshin" : "Пешин"}: <b>${userTime.peshin}</b>\n`;
    const asrText = `${isLatn ? "Asr" : "Аср"}: <b>${userTime.asr}</b>\n`;
    const maghribText = isRamadan
        ? `${isLatn ? "Shom (Iftor)" : "Шом (Ифтор)"}: <b>${userTime.shom}</b>\n`
        : `${isLatn ? "Shom" : "Шом"}: <b>${userTime.shom}</b>\n`;
    const ishaText = `${isLatn ? "Xufton" : "Хуфтон"}: <b>${userTime.xufton}</b>`;
    const duaText = isRamadan
        ? isLatn
            ? `<i>\n\nSaharlik duosi:\n` +
              `«Navaytu an asuma savma shahri Ramazona minal fajri ilal mag‘ribi, xolisan lillahi ta'ala. Allohu akbar»` +
              `\n\nOg‘iz ochish duosi:\n` +
              `«Allohumma laka sumtu va bika amantu va 'alayka tavakkaltu va 'ala rizqika aftortu. ` +
              `Fag‘fir li ya G‘offaru ma qoddamtu va ma axxortu».</i>`
            : `<i>\n\nСаҳарлик дуоси:\n` +
              `«Навайту ан асума совма шаҳри рамазона минал фажри илал мағриби, холисан лиллаҳи таъала Аллоҳу акбар».` +
              `\n\nОғиз очиш дуоси:\n` +
              `«Аллоҳумма лака сумту ва бика аманту ва ъалайка таваккалту ва ъалаа ризқика афторту. ` +
              `Фағфирли Я Ғоффару ма қоддамту ва ма аххорту».</i>`
        : "";

    return dateText + fajrText + sunriseText + dhuhrText + asrText + maghribText + ishaText + duaText;
};
