import { isActiveCity } from "./is-city-active";
import { Keyboard } from "grammy";

export function broadcastMessageQadrKechasi(lang: number): string {
    if (lang === 1) {
        return (
            "<b>Ғафлатда қолманг! Тақдирлар белгиланадиган кеча – Лайлатул қадр кечаси</b>\n\n" +
            "https://muslim.uz/oz/e/post/17475-g-aflatda-qolmang-taqdirlar-belgilanadigan-kecha-laylatul-qadr-kechasi-3"
        );
    } else {
        return (
            "<b>G'aflatda qolmang! Taqdirlar belgilanadigan kecha – Laylatul qadr kechasi</b>\n\n" +
            "https://muslim.uz/uz/e/post/17475-g-aflatda-qolmang-taqdirlar-belgilanadigan-kecha-laylatul-qadr-kechasi-3"
        );
    }
}

// export function broadcastMessageIdFitr(lang: number): string {
//     if (lang === 1) {
//         return "Рамазон ҳайити муборак бўлсин! 🎉🎉🎉";
//     } else {
//         return "Ramazon hayiti muborak bo'lsin! 🎉🎉🎉";
//     }
// }

export async function makeDashboardReplyKeyboard(lang: number, city?: number | string, activeCities?: number[]) {
    const keyboard = new Keyboard();
    const cityNumber = city ? Number(city) : NaN;

    if (!Number.isNaN(cityNumber)) {
        if (activeCities && activeCities.length > 0) {
            if (activeCities.includes(cityNumber)) {
                keyboard.text(lang === 1 ? "🕘 Бугунги намоз вақтлари" : "🕘 Bugungi namoz vaqtlari").row();
            }
        } else {
            if (await isActiveCity(cityNumber)) {
                keyboard.text(lang === 1 ? "🕘 Бугунги намоз вақтлари" : "🕘 Bugungi namoz vaqtlari").row();
            }
        }
    }

    keyboard.text(lang === 1 ? "⚙️ Созламалар" : "⚙️ Sozlamalar").row();

    return keyboard.resized();
}
