import client from "./scrapeBadger.js";

export async function searchNews(query) {
    console.log("Searching news for", query);
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout after 10000ms")), 10000)
        );
        const res = await Promise.race([
            client.google.news.search({ q: query }),
            timeoutPromise
        ]);
        
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
    }
}