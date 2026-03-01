import { cronJob } from "./send";

const sendPrayerTimes = async () => {
    await cronJob(1);
    console.log(1);
    await cronJob(2);
    console.log(2);
    await cronJob(3);
    console.log(3);
};

sendPrayerTimes();
