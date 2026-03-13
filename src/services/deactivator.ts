import { sendLog } from "./log";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { ptu } from "../db/schema";
import { db } from "../db";

export async function deactivator(tg_id: number | string): Promise<void> {
    try {
        const updated = await db
            .update(ptu)
            .set({ is_active: false })
            .where(eq(ptu.tg_id, String(tg_id)))
            .returning();

        if (!updated.length) {
            await sendLog(`❗️ Xizmatni o'chirib bo'lmadi (foydalanuvchi topilmadi):\n\n👤 User ID: ${tg_id}`);
        } else {
            await sendLog(`⚰️ Foydalanuvchi ${tg_id} uchun xizmat o'chirildi`);
        }
    } catch (error) {
        const errorMsg = `❗️ Xizmatni o'chirish jarayonida xatolik yuz berdi:\n\n👤 User ID: ${tg_id}\n💣 Xato: `;
        if (error instanceof Error) {
            await sendLog(`${errorMsg}${error.message}`);
        } else {
            await sendLog(`${errorMsg}${error}`);
        }
    }
}
