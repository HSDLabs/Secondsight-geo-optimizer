import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const client = new ScrapeBadger({
    apiKey: process.env.SCRAPEBADGER_API_KEY,
});

async function test() {
    try {
        await client.reddit.search.posts({
            q: "nike",
            sort: "top",
            t: "month",
            limit: 2,
        });
    } catch (err) {
        console.log("FULL ERROR:");
        console.dir(err, { depth: null });
    }
}
test();
