# namoz-vaqtlari-bot

**Cloudflare Workers** yordamida ishlaydigan va **Supabase** ma'lumotlar bazasidan foydalanadigan **Telegram bot**. Bot foydalanuvchilarga har kuni ularning tanlagan hududi va vaqti bo'yicha kunlik namoz vaqtlarini avtomatik ravishda yuborish uchun mo'ljallangan.

## ✨ Xususiyatlar

- **🌐 Ikki tilli interfeys:** O'zbekcha (Lotin va Kirill alifbosida) til tanlash.
- **📍 Hudud tanlash:** Foydalanuvchi o'zi yashaydigan shaharni tanlashi mumkin.
- **⏰ Vaqtni sozlash:** Xabarnoma yuboriladigan aniq soatni belgilash.
- **🔄 Sozlamalarni o'zgartirish:** Til, hudud, vaqt va obuna holatini o'zgartirish.
- **✅ Obunani boshqarish:** Xabarnomalarni to'xtatish va qayta tiklash.
- **🛠 Notification:** Yangi foydalanuvchi haqida adminga xabar yuborish.
- **🕌 Jadval bo'yicha yuborish:** Kunlik namoz vaqtlarini belgilangan vaqtda avtomatik yuborish uchun jadval (cron job) funksiyasi.

## ⚙️ Texnologiyalar

- **Telegram Bot API**
- **grammY** — Telegram bot uchun.
- **Supabase** — Ma'lumotlar bazasi.

## 🚀 Loyihani Ishga Tushirish

### 1. Ishni boshlash uchun kerak:

- **Node.js**
- **npm** (yoki yarn/pnpm/bun)
- **Cloudflare** akkaunti
- **Supabase** akkaunti
- **Telegram Bot Token** (BotFather orqali olingan)

### 2. Supabase Sozlamalari

1.  **Supabase**'da yangi loyiha yarating.
2.  **`prayer_time_users`** nomli jadval yarating. Jadval quyidagi ustunlarga ega bo'lishi kerak:

| Ustun nomi   | Turi      | Eslatma                                |
| :----------- | :-------- | :------------------------------------- |
| `id`         | `bigint`  | serial                                 |
| `tg_id`      | `text`    | Telegram foydalanuvchisi IDsi (unique) |
| `first_name` | `text`    | Telegram user ismi                     |
| `last_name`  | `text`    | Telegram user familyasi                |
| `username`   | `text`    | Telegram user username'i               |
| `city`       | `int`     | Tanlangan shahar IDsi                  |
| `time`       | `int`     | Xabarnoma yuborish vaqti (soat)        |
| `language`   | `int`     | Til kodi (1 - Kirill, 2 - Lotin)       |
| `is_active`  | `boolean` | Obuna holati (default: true)           |

3.  **`prayer_times`** nomli jadval yarating. Jadval quyidagi ustunlarga ega bo'lishi kerak:

| Ustun nomi       | Turi         | Eslatma                        |
| :--------------- | :----------- | :----------------------------- |
| `id`             | `bigint`     | serial                         |
| `city`           | `int`        | Tanlangan shahar IDsi (unique) |
| `date_text_cyrl` | `text`       | Date - kirill yozuvida         |
| `date_text_uz`   | `text`       | Date - lotin yozuvida          |
| `tong`           | `VARCHAR(5)` | Bomdod kirish vaqti            |
| `quyosh`         | `VARCHAR(5)` | Quyosh chiqish vaqti           |
| `peshin`         | `VARCHAR(5)` | Peshin                         |
| `asr`            | `VARCHAR(5)` | Asr                            |
| `shom`           | `VARCHAR(5)` | Shom                           |
| `xufton`         | `VARCHAR(5)` | Xufton                         |

### 3. Environment Variables

Cloudflare Workers loyihangizda quyidagi environment variable'larini sozlang:

| O'zgaruvchi     | Tavsif                                                           |
| :-------------- | :--------------------------------------------------------------- |
| `BOT_TOKEN`     | Telegram bot token.                                              |
| `SUPABASE_URL`  | Supabase URL manzili.                                            |
| `SUPABASE_KEY`  | Supabase key.                                                    |
| `ADMIN_CHAT_ID` | Yangi foydalanuvchi haqida xabar yuborish uchun admin chat IDsi. |

### 4. Loyihani Joylash

1.  Barcha bog'liqliklarni o'rnating:
    ```bash
    npm install
    ```
2.  Loyihani Cloudflare Workers'ga joylang:
    ```bash
    npx wrangler deploy
    ```
3.  Loyihani joylagandan so'ng, Worker URL manzilini oling va Telegram botining **Webhook** manzili sifatida o'rnating (Cloudflare Worker URL manzilini o'rnating, brauzerda yoki cURL orqali):
    ```bash
    https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>
    ```

### 5. Cron Sozlamalari

Loyihaning to'g'ri ishlashi uchun **`wrangler.jsonc`** faylingizda quyidagi **cron trigger**'lar kiritishingiz kerak. Bu Worker orqali namoz vaqtlarini jo'natish uchun kerak:

```json
"triggers": {
    "crons":
        [
            "0 0-18,20-23 * * *",
			"1-10 19 * * *",
        ]
    }
```

---

> **Eslatma:** Cron vaqtlari Cloudflare Workers'ning UTC asosidagi ish jadvaliga muvofiq sozlanishi kerak. Mening code'imda Toshkent vaqti (UTC+5) hisobga olinib yozilgan.

## 📜 Loyiha tuzilishi

| Fayl/Papkalar           | Tavsif                                                                                                                      |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`              | Botning asosiy fayli, barcha buyruqlar va callback query'larni boshqaradi, Supabase'ga ulanadi va Workers'da ishga tushadi. |
| `data/cities.json`      | Shaharlar/tumanlar ro'yxati fayl.                                                                                           |
| `data/parser.json`      | Ba'zi kirill-lotin lug'atlar.                                                                                               |
| `scheduler/send.js`     | Belgilangan soatda namoz vaqtlarini foydalanuvchilarga yuborish logikasi.                                                   |
| `scheduler/get-data.js` | Namoz vaqtlari ma'lumotlarini islom.uz saytidan olish logikasi.                                                             |

## 🤝 Hissa Qo'shish

Bu code ochiq. Agar loyihani yaxshilashga hissa qo'shmoqchi bo'lsangiz, **pull request (PR)** yuborishingiz mumkin.

---
