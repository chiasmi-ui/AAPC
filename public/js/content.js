// Content queries shared by the Express server (require) and the browser (window.AAPCContent).
// The browser uses them directly in static mode (GitHub Pages), where there is no server.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AAPCContent = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PLACEHOLDER_BODY = [
    'This is placeholder article text. Once the editorial team publishes this piece, the full story will appear here: personal essays, interviews, poetry, photo stories and more from the AAPC community.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
  ];

  const isPublished = (article, now = new Date()) => new Date(article.publishDate) <= now;

  function summarize(article) {
    const { content, images, ...rest } = article;
    return rest;
  }

  // query: { year, month, topic, featured }
  function listArticles(articles, query = {}, now = new Date()) {
    const { year, month, topic, featured } = query;
    let list = articles.filter((a) => isPublished(a, now));
    if (year) list = list.filter((a) => new Date(a.publishDate).getFullYear() === Number(year));
    if (month) list = list.filter((a) => new Date(a.publishDate).getMonth() + 1 === Number(month));
    if (topic) list = list.filter((a) => a.topic.toLowerCase() === String(topic).toLowerCase());
    if (featured === true || featured === 'true') list = list.filter((a) => a.featured);
    list.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    return list.map(summarize);
  }

  function getArticle(articles, id, now = new Date()) {
    const article = articles.find((a) => a.id === id);
    if (!article || !isPublished(article, now)) return null;
    return {
      ...summarize(article),
      content: article.content && article.content.length ? article.content : PLACEHOLDER_BODY,
      images: article.images || []
    };
  }

  // Year -> month -> count tree for the archive sidebar, plus the topic list.
  function archive(articles, now = new Date()) {
    const tree = {};
    const topics = new Set();
    for (const a of articles.filter((x) => isPublished(x, now))) {
      const d = new Date(a.publishDate);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      tree[y] = tree[y] || {};
      tree[y][m] = (tree[y][m] || 0) + 1;
      topics.add(a.topic);
    }
    return { tree, topics: [...topics].sort() };
  }

  function listEvents(events, query = {}) {
    const { year, month } = query;
    let list = events;
    if (year) list = list.filter((e) => new Date(e.start).getFullYear() === Number(year));
    if (month) list = list.filter((e) => new Date(e.start).getMonth() + 1 === Number(month));
    return [...list].sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  // Next month's article drop + next magazine release.
  function countdowns(articles, magazines, now = new Date()) {
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const upcoming = articles
      .filter((a) => {
        const d = new Date(a.publishDate);
        return d >= nextMonthStart && d < monthAfter;
      })
      .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
    const nextMagazine = magazines
      .filter((m) => new Date(m.releaseDate) > now)
      .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))[0];
    return {
      nextMonth: {
        year: nextMonthStart.getFullYear(),
        month: nextMonthStart.getMonth() + 1,
        count: upcoming.length,
        topics: [...new Set(upcoming.map((a) => a.topic))],
        // Count down to the first scheduled article, or the 1st of next month if none are scheduled yet.
        releaseDate: upcoming.length ? upcoming[0].publishDate : nextMonthStart.toISOString()
      },
      magazine: nextMagazine
        ? { id: nextMagazine.id, title: nextMagazine.title, theme: nextMagazine.theme, releaseDate: nextMagazine.releaseDate, cover: nextMagazine.cover }
        : null
    };
  }

  function listMagazines(magazines, now = new Date()) {
    return magazines
      .map(({ fullContent, ...m }) => ({ ...m, released: new Date(m.releaseDate) <= now }))
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  }

  return { isPublished, listArticles, getArticle, archive, listEvents, countdowns, listMagazines };
});
