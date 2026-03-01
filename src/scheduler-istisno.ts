import { cronJob } from "./send";

const sendPrayerTimes = async () => {
    await cronJob(6);
    console.log(6);
    await cronJob(7);
    console.log(7);
    await cronJob(8);
    console.log(8);
    await cronJob(9);
    console.log(9);
};

sendPrayerTimes();
