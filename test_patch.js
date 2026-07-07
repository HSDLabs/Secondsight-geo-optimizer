import { searchReddit } from "./server/services/externalWeb/reddit.js";

async function test() {
    try {
        console.log("Testing searchReddit...");
        const result = await searchReddit("nike");
        console.log("SUCCESS:", result.length, "posts");
    } catch (err) {
        console.error("ERROR:", err);
    }
}
test();
