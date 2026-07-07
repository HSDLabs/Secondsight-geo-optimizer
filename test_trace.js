import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const client = new ScrapeBadger({
    apiKey: process.env.SCRAPEBADGER_API_KEY,
});

const originalRequest = client.request;
client.request = async function(...args) {
    console.log("REQUEST ARGS:", JSON.stringify(args, null, 2));
    return originalRequest.apply(this, args);
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
        console.error("ERROR:", err);
    }
}
test();
