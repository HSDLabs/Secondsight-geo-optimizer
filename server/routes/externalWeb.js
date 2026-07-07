import express from "express";
import { analyzeExternalWeb } from "../services/externalWeb/index.js";

const router = express.Router();

router.post("/analyze", analyzeExternalWeb);

export default router;