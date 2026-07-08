import express from "express";
import { analyzeExternalWeb } from "../services/externalWeb/index.js";
import { generateSummary } from "../services/externalWeb/summarize.js";

const router = express.Router();

router.post("/analyze", analyzeExternalWeb);

router.post("/summarize", async (req, res) => {
    try {
        const { entity, reddit, news } = req.body;
        const aiResult = await generateSummary(entity, reddit, news);
        res.json({ success: true, ...aiResult });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;