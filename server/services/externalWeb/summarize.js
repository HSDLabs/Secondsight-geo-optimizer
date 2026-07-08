import dotenv from 'dotenv';
dotenv.config();

export async function generateSummary(entity, redditData, newsData) {
    const apiKey = process.env.CHATGPT_API_KEY;
    if (!apiKey) {
        throw new Error('CHATGPT_API_KEY is not set');
    }

    const redditContext = (redditData || []).slice(0, 15).map(r => 
        `- r/${r.subreddit} (Score: ${r.score}): ${r.title}`
    ).join('\n');

    const newsContext = (newsData || []).slice(0, 10).map(n => 
        `- ${n.publisher || n.source}: ${n.title || n.headline}`
    ).join('\n');

    const prompt = `
You are an expert brand analyst. Analyze the following Reddit discussions and News articles about the entity "${entity?.name || 'this brand'}".

Reddit Discussions:
${redditContext || 'None found.'}

News Articles:
${newsContext || 'None found.'}

Task 1: Synthesize a comprehensive summary covering:
1. Overall public perception
2. Main discussion topics
3. Positive themes
4. Negative themes
5. Interesting observations

Format the summary entirely in natural language paragraphs. Do not use bullet points or strict lists. Write an engaging, insightful, and flowing summary that references both the news context and reddit conversations naturally. Keep it concise but analytical.

Task 2: Extract the top 6 trending topics or keywords from the data.
For each topic, provide a single word or short phrase, and an estimated "relevance score" between 0 and 100 based on its prominence.

You must respond ONLY with a valid JSON object in the following format:
{
  "summary": "Your flowing paragraph summary here...",
  "trendingTopics": [
    { "topic": "Keyword", "score": 85 }
  ]
}
    `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: 'You are an expert brand analyst. Respond in JSON format.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI Error: ${errText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        
        try {
            const parsed = JSON.parse(text);
            return parsed;
        } catch (e) {
            console.error("JSON parse error:", e);
            return {
                summary: text || "Unable to generate summary at this time.",
                trendingTopics: []
            };
        }
    } catch (err) {
        console.error("Summary Generation Error:", err);
        return {
            summary: "An error occurred while generating the summary.",
            trendingTopics: []
        };
    }
}
