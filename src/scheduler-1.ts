import { cronJob } from "./send";

const sendPrayerTimes = async () => {
    // const hour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent", hour: "2-digit", hour12: false }));
    // await cronJob(hour);
    await cronJob(1);
    console.log(1)
    await cronJob(2);
    console.log(2)
    await cronJob(3);
    console.log(3)
    await cronJob(4);
    console.log(4)
    await cronJob(5);
    console.log(5)
    await cronJob(6);
    console.log(6)

};

sendPrayerTimes();
