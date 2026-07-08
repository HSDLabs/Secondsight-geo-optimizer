import client from "./scrapeBadger.js";
import { normalizeReddit } from "./normalize.js";

export async function searchReddit(query) {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout after 10000ms")), 10000)
        );
        const result = await Promise.race([
            client.reddit.search.posts({
                query,
                sort: "top",
                time: "month",
                limit: 10,
            }),
            timeoutPromise
        ]);

        return normalizeReddit(result.posts || []);
    } catch (e) {
        console.error("Reddit search error:", e.message);
        return [];
    }
}