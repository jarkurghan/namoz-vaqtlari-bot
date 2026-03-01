import { cronJob } from "./send";

const sendPrayerTimes = async () => {
    await cronJob(4);
    console.log(4);
    await cronJob(5);
    console.log(5);
    // await cronJob(3);
    // console.log(3);
};

sendPrayerTimes();
