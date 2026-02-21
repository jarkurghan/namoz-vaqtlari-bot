import { cronJob } from "./send";

const sendPrayerTimes = async () => {
    const hour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent", hour: "2-digit", hour12: false }));
    await cronJob(hour);
};

sendPrayerTimes();
