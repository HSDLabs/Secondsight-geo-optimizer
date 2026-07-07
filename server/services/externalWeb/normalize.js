export function normalizeReddit(posts = []) {

    return posts.map(post => ({

        id: post.id,

        title: post.title,

        subreddit: post.subreddit,

        author: post.author,

        score: post.score,

        comments: post.num_comments,

        url: post.url,

        permalink: post.permalink,

        createdAt: post.created_at,

        source: "reddit"

    }));
}