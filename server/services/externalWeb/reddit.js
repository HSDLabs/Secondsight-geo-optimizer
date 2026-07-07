import client from "./scrapeBadger.js";
import { normalizeReddit } from "./normalize.js";

export async function searchReddit(query) {

    const result = await client.reddit.search.posts({
        query,
        sort: "top",
        time: "month",
        limit: 10,
    });

    return normalizeReddit(result.posts || []);
}