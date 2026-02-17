import { getData } from "./get-data";

const sendPostWithButtons = async () => {
    const minute = new Date().getUTCMinutes();
    await getData(minute - 1);
};

sendPostWithButtons();
