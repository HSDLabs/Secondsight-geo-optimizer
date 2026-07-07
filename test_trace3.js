import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const client = new ScrapeBadger({
    apiKey: process.env.SCRAPEBADGER_API_KEY,
});

const originalRequest = client.reddit.request;
client.reddit.request = async function (...args) {
    console.log("REQUEST ARGS:", JSON.stringify(args, null, 2));
    throw new Error("STOP");
};

async function test() {
    try {
        await client.reddit.search.posts({
            query: "nike",
            sort: "top",
            time: "month",
            limit: 2,
        });
    } catch (err) {
        if (err.message !== "STOP") console.error("ERROR:", err);
    }
}
test();
