const { feedPlugin } = require("@11ty/eleventy-plugin-rss");
const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Add date filters
  eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
    return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy");
  });

  eleventyConfig.addFilter("dateToRfc3339", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toISO();
  });

  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat('yyyy-LL-dd');
  });

  eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
    return (tags || []).filter(tag => ["all", "posts"].indexOf(tag) === -1);
  });
  // Helper function to compute permalink from filename
  function computePermalink(fileSlug) {
    // Strip date prefix (YYYYMMDD_) if present
    return fileSlug.replace(/^\d{8}_/, '');
  }

  // Add filter to get permalink (from front matter or computed from filename)
  eleventyConfig.addFilter('permalink', function(post) {
    return post.data.permalink || computePermalink(post.fileSlug);
  });

  // Add filter to get permalink without slashes (for JSON)
  eleventyConfig.addFilter('permalinkSlug', function(post) {
    const permalink = post.data.permalink || computePermalink(post.fileSlug);
    return permalink.replace(/^\/|\/$/g, '');
  });

  // Add filter to normalize permalink (ensure single leading/trailing slash)
  eleventyConfig.addFilter('normalizePermalink', function(permalink) {
    if (!permalink) return '/';
    // Remove all leading/trailing slashes, then add exactly one of each
    const cleaned = permalink.replace(/^\/+|\/+$/g, '');
    return '/' + cleaned + '/';
  });

  // Passthrough static assets
  eleventyConfig.addPassthroughCopy("site/styles");
  eleventyConfig.addPassthroughCopy("site/styles.css");
  eleventyConfig.addPassthroughCopy("site/js");
  eleventyConfig.addPassthroughCopy("site/assets");
  eleventyConfig.addPassthroughCopy("site/config.json");
  eleventyConfig.addPassthroughCopy("site/feed/pretty-atom-feed.xsl");

  // Copy raw Markdown posts for client-side rendering (optional, for future use)
  // eleventyConfig.addPassthroughCopy({ "site/posts": "posts" });

  // Create posts collection
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("site/posts/*.md").sort((a, b) => {
      return new Date(b.data.date || 0) - new Date(a.data.date || 0);
    });
  });

  // RSS Feed plugin
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed/feed.xml",
    stylesheet: "pretty-atom-feed.xsl",
    collection: {
      name: "posts",
      limit: 20,
    },
    metadata: {
      language: "en",
      title: "Beyond Clarity",
      subtitle: "Smooth exchanges between the discrete and the continuous",
      base: "https://beyond-clarity.github.io/",
      author: {
        name: "Beyond Clarity"
      }
    }
  });

  return {
    dir: { 
      input: "site", 
      output: "_site",
      includes: "_includes"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};

