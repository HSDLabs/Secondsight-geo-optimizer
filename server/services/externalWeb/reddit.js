import client from "./scrapeBadger.js";
import { normalizeReddit } from "./normalize.js";

export async function searchReddit(query) {
    let timer;
    try {
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("Timeout after 10000ms")), 10000);
        });

        const call = client.reddit.search
            .posts({
                query,
                sort: "top",
                time: "month",
                limit: 10,
            })
            .catch(() => null);

        const result = await Promise.race([call, timeout]);
        if (!result) return [];

        return normalizeReddit(result.posts || []);
    } catch (e) {
        console.error("Reddit search error:", e.message);
        return [];
    } finally {
        if (timer) clearTimeout(timer);
    }
}