import { resolveEntity } from "./entityResolver.js";
import { searchReddit } from "./reddit.js";
import { searchNews } from "./news.js";

export async function analyzeExternalWeb(req, res) {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required",
            });
        }

        const entity = await resolveEntity(url);

        const reddit = await searchReddit(entity.name);
        const news = await searchNews(entity.name);

        return res.json({
            success: true,
            entity,
            reddit,
            news,
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}