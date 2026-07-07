import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const client = new ScrapeBadger({
    apiKey: process.env.SCRAPEBADGER_API_KEY,
});

const originalFetch = global.fetch;
global.fetch = async function (url, options) {
    console.log("FETCH URL:", url);
    return originalFetch(url, options);
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
        // ignore
    }
}
test();
