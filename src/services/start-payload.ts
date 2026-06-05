import type { Context } from "grammy";

export function getStartPayload(ctx: Context): string {
    const text = ctx.message?.text;
    if (!text?.startsWith("/start")) return "";
    const m = text.match(/^\/start(?:\s+(.+))?$/s);
    return m?.[1]?.trim() || "";
}

export function objPayload(payload: string): { [key: string]: string } {
    const arr = payload.toLowerCase().split("--");

    const obj: any = {};
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i].split("-");
        if (item.length > 1) obj[item[0]] = item[1];
        else {
            const item = arr[i].split("_");
            if (item.length > 0) obj[item[0]] = item[1];
        }
    }

    return obj;
}

export function findUtm(obj: { [key: string]: string }): string {
    if (obj.mcode) return "@uzbek_tilida_multfilm";

    const utm = obj.utm;
    if (!utm) return "";
    else if (utm === "karyera") return "@meni_botlarim";
    else if (utm.includes("aniuzbot")) return "@aniuz_bot";
    else return utm;
}

export function resolveUtmFromStartPayload(startPayload: string): string {
    const p = startPayload.trim();
    if (!p) return "";

    if (p.includes("utm-")) {
        const utm = p.slice(p.indexOf("utm-") + 4);
        if (utm.includes("karyera")) return "@meni_botlarim";
        else if (utm.includes("aniuzbot")) return "@aniuz_bot";
        else return utm;
    }

    // if (p.slice(0, 5).toLowerCase() === "mcode") return "Multik kanaldan";
    return p;
}
