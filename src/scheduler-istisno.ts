import { cronJob } from "./send";

const sendPrayerTimes = async () => {
    await cronJob(10);
    console.log(10);
    await cronJob(11);
    console.log(11);
    await cronJob(12);
    console.log(12);
    await cronJob(13);
    console.log(13);
    await cronJob(14);
    console.log(14);
};

sendPrayerTimes();
