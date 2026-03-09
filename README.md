# namoz-vaqtlari-bot

Bot foydalanuvchilarga har kuni ularning tanlagan hududi va vaqti bo'yicha kunlik namoz vaqtlarini avtomatik ravishda yuborish uchun mo'ljallangan.

## ✨ Xususiyatlar

- **🌐 Ikki tilli interfeys:** O'zbekcha (Lotin va Kirill alifbosida) til tanlash.
- **📍 Hudud tanlash:** Foydalanuvchi o'zi yashaydigan shaharni tanlashi mumkin.
- **⏰ Vaqtni sozlash:** Xabarnoma yuboriladigan aniq soatni belgilash.
- **🔄 Sozlamalarni o'zgartirish:** Til, hudud, vaqt va obuna holatini o'zgartirish.
- **✅ Obunani boshqarish:** Xabarnomalarni to'xtatish va qayta tiklash.
- **🛠 Notification:** Yangi foydalanuvchi haqida adminga xabar yuborish.
- **💣 Log:** Xatolik haqida admin log chatiga xabar yuborish.
- **⏰ Broadcast:** Sozlamalar tugatilmagan userlar uchun bildirishnoma yuborish.
- **🕌 Jadval bo'yicha yuborish:** Kunlik namoz vaqtlarini belgilangan vaqtda avtomatik yuborish uchun jadval (cron job) funksiyasi.

## ⚙️ Texnologiyalar

- **Telegram Bot API**
- **grammY** — Telegram bot uchun.
- **PostgreSQL** — Ma'lumotlar bazasi.
- **Drizzle ORM** — TypeScript ORM (PostgreSQL uchun).
- **Playwright** — Namoz vaqtlarini olish uchun.

## 🚀 Loyihani Ishga Tushirish

### 1. Ishni boshlash uchun kerak:

- **Node.js**
- **bun** (yoki npm)
- **PostgreSQL** ma'lumotlar bazasi (`DATABASE_URL` bilan)
- **Telegram Bot Token** (BotFather orqali olingan)

### 2. PostgreSQL (Drizzle ORM) sozlamalari

1.  **PostgreSQL**'da yangi ma'lumotlar bazasi yarating.
2.  **`prayer_time_users`** nomli jadval yarating (yoki mavjud bazada shu jadvalni qo'shing). Jadval quyidagi ustunlarga ega bo'lishi kerak:

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

Loyihangizda quyidagi environment variable'larini sozlang:

| O'zgaruvchi             | Tavsif                                                                 |
| :---------------------- | :--------------------------------------------------------------------- |
| `BOT_TOKEN`             | Telegram bot token.                                                    |
| `ADMIN_CHAT_ID`         | Yangi foydalanuvchi haqida xabar yuborish uchun admin chat IDsi.       |
| `ADMIN_PRIVATE_CHAT_ID` | Broadcast uchun - telegram akkount IDsi.                               |
| `LOG_CHAT_ID`           | Xatolik haqida xabar yuborish uchun admin log chat IDsi.               |
| `DB_HOST`               | PostgreSQL server hostname yoki IP manzili (masalan: `127.0.0.1`).     |
| `DB_PORT`               | PostgreSQL porti (masalan: `5432`).                                    |
| `DB_USER`               | PostgreSQL foydalanuvchi nomi.                                         |
| `DB_PASSWORD`           | PostgreSQL foydalanuvchi paroli.                                       |
| `DB_NAME`               | Foydalaniladigan ma'lumotlar bazasi nomi.                              |

### 4. Loyihani deploy

1.  Loyihani serverga clone qiling:
    ```bash
    git clone https://github.com/jarkurghan/namoz-vaqtlari-bot.git
    ```
1.  Paketlarni o'rnating:
    ```bash
    cd namoz-vaqtlari-bot
    bun install
    ```
1.  ishga tushiring:
    ```bash
    bun run dev
    ```
    > Bu birlamchi buyruq. doimiy ishlab turishi uchun (masalan) `pm2`dan foydalaning
1.  Loyihani joylagandan so'ng, server uchun URL manzil oling va Telegram botining **Webhook** manzili sifatida o'rnating (Cloudflare Worker URL manzilini o'rnating, brauzerda yoki cURL orqali):
    ```bash
    https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>
    ```
    > Yoki code'ni webhook usulidan polling usuliga o'tkazing

---

## 🤝 Hissa Qo'shish

Bu code ochiq. Agar loyihani yaxshilashga hissa qo'shmoqchi bo'lsangiz, **pull request (PR)** yuborishingiz mumkin.

---
