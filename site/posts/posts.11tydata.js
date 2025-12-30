module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      // Only compute permalink for markdown files
      if (!data.page.inputPath.endsWith('.md')) {
        return data.permalink;
      }
      // Use permalink from front matter if specified
      if (data.permalink) {
        return `/${data.permalink}/`;
      }
      // Otherwise, strip date prefix from fileSlug
      const slug = data.page.fileSlug.replace(/^\d{8}_/, '');
      return `/${slug}/`;
    },
    layout: (data) => {
      // Use post template for markdown files
      if (data.page.inputPath.endsWith('.md')) {
        return "post.njk";
      }
      return data.layout;
    }
  }
};

