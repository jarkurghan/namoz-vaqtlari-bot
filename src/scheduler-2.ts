import { getData } from "./get-data";

const getPrayerTimesFromIslomUz = async () => {
    const minute = new Date().getUTCMinutes();
    await getData(minute - 1);
};

getPrayerTimesFromIslomUz();
