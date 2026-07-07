async function test() {
    try {
        const res = await fetch("http://localhost:3001/api/externalWeb/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: "https://nike.com" })
        });
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", text);
    } catch (err) {
        console.error(err);
    }
}
test();
