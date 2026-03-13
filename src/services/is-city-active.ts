import { eq } from "drizzle-orm/sql/expressions/conditions";
import { pt } from "../db/schema";
import { db } from "../db";

export const isActiveCity = async (city: number): Promise<boolean> => {
    const currentTimestamp = new Date().getTime();

    try {
        const rows = await db.select({ updatedDate: pt.updated_date }).from(pt).where(eq(pt.city, city)).limit(1);
        const row = rows[0];

        if (!row) return false;

        const cityTimestamp = new Date(row.updatedDate).getTime();

        return 86400000 > currentTimestamp - cityTimestamp;
    } catch (error) {
        console.error(error);
        return false;
    }
};
