export async function resolveEntity(url) {
    const hostname = new URL(url).hostname;

    return {
        name: hostname.replace("www.", "").split(".")[0],
        domain: hostname,
        url,
    };
}