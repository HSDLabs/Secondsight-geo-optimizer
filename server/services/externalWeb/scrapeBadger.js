import { ScrapeBadger } from "scrapebadger";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// File-relative path: works regardless of the process working directory.
// dotenv is also loaded centrally in server/index.js; this is a safe fallback.
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") }); // server/.env

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

let clientInstance = null;

function getClient() {
    if (clientInstance) return clientInstance;

    const apiKey = process.env.SCRAPEBADGER_API_KEY;
    if (!apiKey) {
        throw new Error(
            "SCRAPEBADGER_API_KEY is required. Set it in server/.env (or .env/.env.local) to enable Reddit/News search."
        );
    }

    clientInstance = new ScrapeBadger({ apiKey });
    return clientInstance;
}

// Lazy proxy: defers ScrapeBadger construction until a method is actually called,
// so the server can start even when the API key is not configured.
//
// Supports ARBITRARY depth (e.g. client.google.news.search or client.reddit.search.posts):
// every property access returns a callable proxy that records its path, and calling
// it walks the real client to invoke the matching method.
function makeDeepProxy(path = []) {
    const target = function () {};
    return new Proxy(target, {
        get(_t, prop) {
            // Avoid tripping Promise/coercion logic on the bare proxy.
            if (prop === Symbol.toPrimitive || prop === "then") return undefined;
            return makeDeepProxy([...path, prop]);
        },
        apply(_t, _this, args) {
            const realClient = getClient();
            let parent = realClient;
            let node = realClient;
            for (const key of path) {
                parent = node;
                node = node?.[key];
            }
            if (typeof node !== "function") {
                throw new Error(
                    `ScrapeBadger: client.${path.join(".")} is not a function. ` +
                        `Check the API path against the SDK.`
                );
            }
            return node.apply(parent, args);
        },
    });
}

const client = makeDeepProxy();

export default client;
