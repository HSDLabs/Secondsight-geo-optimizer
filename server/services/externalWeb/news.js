import client from "./scrapeBadger.js";

export async function searchNews(query) {
    console.log("Searching news for", query);
    let timer;
    try {
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("Timeout after 10000ms")), 10000);
        });

        const call = client.google.news.search({ q: query }).catch(() => null);

        const res = await Promise.race([call, timeout]);

        if (!res) return [];

        // Handle different possible array properties from the SDK
        const articles = res?.news_results || res?.organic || res?.articles || [];

        // Map the properties so the frontend expects them nicely
        return articles.map(article => ({
            title: article.title,
            url: article.link || article.url,
            publisher: article.source?.name || article.source || "News Source",
            publishedAt: article.published_at || article.date
        }));
    } catch (e) {
        console.error("News search error:", e.message);
        return [];
    } finally {
        if (timer) clearTimeout(timer);
    }
}