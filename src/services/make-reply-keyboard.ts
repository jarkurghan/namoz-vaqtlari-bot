import { isActiveCity } from "./is-city-active";
import { Keyboard } from "grammy";

export function getBroadcastMessage(lang: number): string {
    if (lang === 1) {
        return (
            "Ассалом алайкум!\n\n" +
            "Энди ботда экраннинг пастидаги reply тугмалар орқали созламаларни ўзгартиришингиз мумкин.\n\n" +
            "• <b>Бугунги намоз вақтлари</b> тугмаси орқали бугунги намоз вақтларини қайта олишингиз мумкин\n" +
            "• <b>Созламалар</b> тугмаси орқали барча созламаларни кўриш ва ўзгартиришингиз мумкин."
        );
    } else {
        return (
            "Assalom alaykum!\n\n" +
            "Endi botda ekran pastidagi reply tugmalar orqali sozlamalarni o'zgartirishingiz mumkin.\n\n" +
            "• <b>Bugungi namoz vaqtlari</b> tugmasi orqali bugungi namoz vaqtlarini qayta olishingiz mumkin\n" +
            "• <b>Sozlamalar</b> tugmasi orqali barcha sozlamalarni ko'rish va o'zgartirish mumkin."
        );
    }
}

export async function makeDashboardReplyKeyboard(lang: number, city?: number | string) {
    const keyboard = new Keyboard();
    const cityNumber = city ? Number(city) : NaN;

    if (!Number.isNaN(cityNumber) && (await isActiveCity(cityNumber))) {
        keyboard.text(lang === 1 ? "🕘 Бугунги намоз вақтлари" : "🕘 Bugungi namoz vaqtlari").row();
    }

    keyboard.text(lang === 1 ? "⚙️ Созламалар" : "⚙️ Sozlamalar").row();

    return keyboard.resized();
}
