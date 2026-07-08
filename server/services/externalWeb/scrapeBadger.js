import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";

dotenv.config({ path: "./server/.env" });

const client = new ScrapeBadger({
    apiKey: process.env.SCRAPEBADGER_API_KEY,
});

// Patch for Reddit query/time -> q/t bug
const originalFetch = global.fetch;
global.fetch = async function (url, options) {
    if (typeof url === "string" && url.includes("reddit/search/posts")) {
        url = url.replace("query=", "q=").replace("time=", "t=");
    } else if (url instanceof URL && url.href.includes("reddit/search/posts")) {
        if (url.searchParams.has("query")) {
            url.searchParams.set("q", url.searchParams.get("query"));
            url.searchParams.delete("query");
        }
        if (url.searchParams.has("time")) {
            url.searchParams.set("t", url.searchParams.get("time"));
            url.searchParams.delete("time");
        }
    }
    return originalFetch(url, options);
};

export default client;