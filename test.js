import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const client = new ScrapeBadger({
    apiKey: process.env.SCRAPEBADGER_API_KEY,
});

async function test() {
    try {
        console.log("Testing reddit.search.posts...");
        const result = await client.reddit.search.posts({
            query: "nike",
            sort: "top",
            time: "month",
            limit: 2,
        });
        console.log("SUCCESS:", Object.keys(result));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

test();
