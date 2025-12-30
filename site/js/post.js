// Initialize post loading
(async function init() {
  // Get permalink from URL path
  const pathname = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const isDraft = urlParams.get('draft') === 'true';
  
  // Extract permalink from path (e.g., /hello-world/ -> hello-world)
  const permalink = pathname.replace(/^\//, '').replace(/\/$/, '');
  
  console.log('=== POST.JS INITIALIZED ===');
  console.log('Post.js loaded:', { pathname, permalink, isDraft, fullURL: window.location.href });
  
  // Check if we're on the homepage (should not happen for post routes)
  if (pathname === '/' || pathname === '') {
    console.error('ERROR: post.js loaded on homepage! This is wrong - should load index.html');
    return;
  }
  
  if (!permalink) {
    // Show detailed debug info on Cloudflare
    console.log('DEBUG - No permalink extracted');
    console.log('DEBUG - Pathname:', pathname);
    console.log('DEBUG - Full URL:', window.location.href);
    console.log('DEBUG - Window location:', {
      href: window.location.href,
      pathname: window.location.pathname,
      hash: window.location.hash,
      search: window.location.search
    });
    
    // If pathname is not /, this is an invalid post URL - show 404
    if (pathname !== '/' && pathname !== '') {
      console.log('Invalid post URL - showing 404');
      document.getElementById('post-content').innerHTML = `
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 2rem; margin: 2rem 0;">
          <h1 style="margin: 0 0 1rem 0; color: #721c24; font-size: 2em;">404 - Post Not Found</h1>
          <p style="margin: 0.5rem 0; color: #721c24;">
            The post at <code style="background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px;">${pathname}</code> could not be found.
          </p>
          <p style="margin-top: 2rem;">
            <a href="/" style="color: #155724; text-decoration: none; font-weight: bold;">← Back to homepage</a>
          </p>
        </div>
      `;
      return;
    }
    
    // Otherwise, it's the homepage or root - show the error
    console.log('No permalink on homepage - showing error');
    document.getElementById('post-content').innerHTML = `
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 1rem;">
        <strong>No Post Specified</strong>
        <p style="margin-top: 0.5rem; font-size: 0.9em;">
          The URL should be like: <code>/your-post-name/</code>
        </p>
        <details style="margin-top: 1rem; font-size: 0.9em;">
          <summary style="cursor: pointer;">View Debug Info</summary>
          <pre style="margin-top: 0.5rem; background: #f4f4f4; padding: 0.5rem; overflow-x: auto;">
Pathname: ${pathname}
Permalink extracted: "${permalink}"
Is Draft: ${isDraft}
URL: ${window.location.href}
Pathname: ${window.location.pathname}
Hash: ${window.location.hash}
Search: ${window.location.search}
          </pre>
        </details>
      </div>
    `;
  } else {
    await loadPost(permalink, isDraft);
  }
})();

async function loadPost(permalink, isDraft = false) {
  const contentEl = document.getElementById('post-content');
  const pathname = window.location.pathname; // Store locally for error handling
  
  try {
    // First, load the index to map permalink to filename
    const indexPath = isDraft ? '/drafts/index.json' : '/posts/index.json';
    console.log(`Loading index: ${indexPath}`);
    const indexResponse = await fetch(indexPath);
    if (!indexResponse.ok) {
      throw new Error(`Could not load post index: ${indexResponse.status} ${indexResponse.statusText} from ${indexPath}`);
    }
    
    const posts = await indexResponse.json();
    console.log(`Index loaded: ${posts.length} posts found`);
    
    const post = posts.find(p => p.permalink === permalink);
    
    if (!post) {
      throw new Error(`Post with permalink '${permalink}' not found in index`);
    }
    
    console.log(`Found post: ${post.filename}`);
    
    // Now load the markdown file using the actual filename
    const postPath = isDraft ? `/drafts/${post.filename}.md` : `/posts/${post.filename}.md`;
    console.log(`Loading markdown: ${postPath}`);
    const response = await fetch(postPath);
    if (!response.ok) {
      throw new Error(`Could not load markdown file: ${response.status} ${response.statusText} from ${postPath}`);
    }
    
    const markdown = await response.text();
    console.log(`Markdown loaded: ${markdown.length} characters`);
    
    // Parse front matter
    const { frontMatter, content } = parseFrontMatter(markdown);
    
    // Update page title
    if (frontMatter.title) {
      document.title = `${frontMatter.title} - Beyond Clarity`;
    }
    
    // Configure marked to not escape math delimiters
    marked.setOptions({
      breaks: false,
      gfm: true,
      pedantic: false
    });
    
    // Render markdown
    const html = marked.parse(content);
    
    // Build article HTML with title and meta
    let articleHTML = '';
    if (isDraft) {
      articleHTML += `<div style="background-color: #fff3cd; border-left: 4px solid #e67e22; padding: 1rem; margin-bottom: 1.5rem;">
        <strong style="color: #e67e22;">📝 DRAFT</strong> — This article is a work in progress and only visible in development mode.
      </div>`;
    }
    if (frontMatter.title) {
      articleHTML += `<h1>${frontMatter.title}</h1>`;
    }
    
    // Build metadata with published and updated dates
    if (frontMatter.date) {
      articleHTML += `<div class="post-meta">`;
      articleHTML += `<time datetime="${frontMatter.date}">Published: ${formatDate(frontMatter.date)}</time>`;
      
      // Handle updated dates if present (support both single date and array)
      if (frontMatter.updated) {
        let updatedDates = [];
        
        // Handle both single date (string) and array of dates
        if (Array.isArray(frontMatter.updated)) {
          updatedDates = frontMatter.updated;
        } else if (typeof frontMatter.updated === 'string') {
          updatedDates = [frontMatter.updated];
        }
        
        if (updatedDates.length > 0) {
          const sortedDates = updatedDates.map(d => new Date(d)).sort((a, b) => b - a);
          const mostRecent = sortedDates[0];
          
          if (updatedDates.length === 1) {
            articleHTML += `<br><time datetime="${mostRecent.toISOString().split('T')[0]}">Updated: ${formatDate(mostRecent.toISOString().split('T')[0])}</time>`;
          } else {
            articleHTML += `<br><time datetime="${mostRecent.toISOString().split('T')[0]}">Updated: ${formatDate(mostRecent.toISOString().split('T')[0])}</time> (and ${updatedDates.length - 1} earlier update${updatedDates.length - 1 === 1 ? '' : 's'})`;
          }
        }
      }
      
      articleHTML += `</div>`;
    }
    
    articleHTML += html;
    
    // Automatically add bibliography div if cite exists in frontmatter and not already present
    if (frontMatter.cite && (Array.isArray(frontMatter.cite) ? frontMatter.cite.length > 0 : frontMatter.cite)) {
      // Check if bibliography div already exists in the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = articleHTML;
      const existingBib = tempDiv.querySelector('#bibliography');
      
      if (!existingBib) {
        // Add bibliography div at the end of the article
        articleHTML += '<div id="bibliography"></div>';
      }
    }
    
    contentEl.innerHTML = articleHTML;
    
    // Convert YouTube URLs to embedded videos
    convertYouTubeLinks(contentEl);
    
    // Execute any scripts that were in the markdown
    executeScripts(contentEl);
    
    // Highlight code blocks
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
    
    // Typeset math with MathJax (wait for it to load if needed)
    typesetMath(contentEl);
    
    // Load additional libraries if specified (AFTER content is rendered)
    if (frontMatter.libs && frontMatter.libs.length > 0) {
      await loadLibraries(frontMatter.libs);
    }
    
    // Process citations (server-side pre-generated)
    if (frontMatter.cite) {
      await processCitationsFromServer(contentEl, post.filename);
    }

    // Update footer with authors or default
    await updateFooterCopyright(frontMatter);
    
  } catch (error) {
    console.error('Error loading post:', error);
    const errorDetails = error.message || error.toString();
    const currentPathname = window.location.pathname; // Get fresh pathname in catch block
    
    // Check if this is a "not found" error - show 404 page
    if (errorDetails.includes('not found') || errorDetails.includes('404')) {
      contentEl.innerHTML = `
        <h1>404 - Post Not Found</h1>
        <p>
          The post at <code>${currentPathname}</code> could not be found.
        </p>
        <p>
          <a href="/">← Back to homepage</a>
        </p>
      `;
    } else {
      // Other errors - show detailed error info
      contentEl.innerHTML = `
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 1rem; margin-bottom: 1rem;">
          <strong style="color: #721c24;">Error Loading Post</strong>
          <p style="color: #721c24; margin-top: 0.5rem;">${errorDetails}</p>
          <details style="margin-top: 1rem; font-size: 0.9em;">
            <summary style="cursor: pointer; color: #155724;">View Debug Info</summary>
            <pre style="margin-top: 0.5rem; background: #f4f4f4; padding: 0.5rem; overflow-x: auto;">Permalink: ${permalink}
Is Draft: ${isDraft}
Pathname: ${currentPathname}
Full URL: ${window.location.href}
Error: ${error.stack || errorDetails}</pre>
          </details>
        </div>
      `;
    }
  }
}

async function updateFooterCopyright(frontMatter) {
  try {
    let defaultAuthor = 'Beyond Clarity';
    try {
      const res = await fetch('/config.json', { cache: 'no-cache' });
      if (res.ok) {
        const cfg = await res.json();
        if (cfg && typeof cfg.defaultAuthor === 'string' && cfg.defaultAuthor.trim()) {
          defaultAuthor = cfg.defaultAuthor.trim();
        }
      }
    } catch (_) {}

    let authors = [];
    const fmAuthors = frontMatter.authors;
    if (Array.isArray(fmAuthors)) {
      authors = fmAuthors.filter(Boolean);
    } else if (typeof fmAuthors === 'string' && fmAuthors.trim()) {
      authors = [fmAuthors.trim()];
    }
    if (authors.length === 0) authors = [defaultAuthor];

    let year = new Date().getFullYear();
    if (frontMatter.date) {
      const d = new Date(frontMatter.date);
      if (!isNaN(d.getTime())) year = d.getFullYear();
    }

    const text = `© ${year} ${authors.join(', ')}. All Rights Reserved.`;
    const el = document.getElementById('copyright-line');
    if (el) el.textContent = text;
  } catch (err) {
    console.error('Footer update error:', err);
  }
}

function parseFrontMatter(markdown) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontMatterRegex);
  
  if (!match) {
    return { frontMatter: {}, content: markdown };
  }
  
  const frontMatterText = match[1];
  const content = match[2];
  
  // Simple YAML parser for basic front matter
  const frontMatter = {};
  frontMatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // Handle arrays [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim());
    }
    
    frontMatter[key] = value;
  });
  
  return { frontMatter, content };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function convertYouTubeLinks(container) {
  // Regular expressions to match YouTube URLs
  const youtubeRegexes = [
    // youtube.com/watch?v=VIDEO_ID or youtube.com/watch?v=VIDEO_ID&t=123
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:[^\s<>]*)?/g,
    // youtu.be/VIDEO_ID or youtu.be/VIDEO_ID?t=123
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)(?:[^\s<>]*)?/g
  ];
  
  // Find all links in the container
  const links = container.querySelectorAll('a[href]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    let videoId = null;
    let startTime = null;
    
    // Try to match youtube.com/watch?v= format
    const watchMatch = href.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
      // Extract start time from URL parameters
      const timeMatch = href.match(/[?&]t=(\d+)/);
      if (timeMatch) {
        startTime = parseInt(timeMatch[1], 10);
      }
    } else {
      // Try to match youtu.be/ format
      const shortMatch = href.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (shortMatch) {
        videoId = shortMatch[1];
        // Extract start time from URL parameters
        const timeMatch = href.match(/[?&]t=(\d+)/);
        if (timeMatch) {
          startTime = parseInt(timeMatch[1], 10);
        }
      }
    }
    
    if (videoId) {
      // Build embed URL with privacy-enhanced mode
      let embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
      if (startTime) {
        embedUrl += `?start=${startTime}`;
      } else {
        embedUrl += '?';
      }
      // Add additional parameters for better UX
      embedUrl += (startTime ? '&' : '') + 'modestbranding=1&rel=0';
      
      // Create the embed container
      const embedContainer = document.createElement('div');
      embedContainer.className = 'youtube-embed';
      
      // Create the iframe
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.title = 'YouTube video player';
      
      embedContainer.appendChild(iframe);
      
      // Replace the link with the embed
      link.parentNode.replaceChild(embedContainer, link);
    }
  });
  
  // Also check for plain YouTube URLs in text nodes (not in links)
  // This handles cases where URLs are written as plain text
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip text nodes inside code blocks, scripts, or styles
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tagName = parent.tagName;
        if (tagName === 'CODE' || tagName === 'PRE' || 
            tagName === 'SCRIPT' || tagName === 'STYLE' ||
            tagName === 'A') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    let videoId = null;
    let startTime = null;
    let matchedUrl = null;
    
    // Check for youtube.com/watch?v= format
    const watchMatch = text.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:[^\s<>]*)?/);
    if (watchMatch) {
      videoId = watchMatch[1];
      matchedUrl = watchMatch[0];
      const timeMatch = matchedUrl.match(/[?&]t=(\d+)/);
      if (timeMatch) {
        startTime = parseInt(timeMatch[1], 10);
      }
    } else {
      // Check for youtu.be/ format
      const shortMatch = text.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)(?:[^\s<>]*)?/);
      if (shortMatch) {
        videoId = shortMatch[1];
        matchedUrl = shortMatch[0];
        const timeMatch = matchedUrl.match(/[?&]t=(\d+)/);
        if (timeMatch) {
          startTime = parseInt(timeMatch[1], 10);
        }
      }
    }
    
    if (videoId && matchedUrl) {
      // Build embed URL
      let embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
      if (startTime) {
        embedUrl += `?start=${startTime}`;
      } else {
        embedUrl += '?';
      }
      embedUrl += (startTime ? '&' : '') + 'modestbranding=1&rel=0';
      
      // Create the embed container
      const embedContainer = document.createElement('div');
      embedContainer.className = 'youtube-embed';
      
      // Create the iframe
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.title = 'YouTube video player';
      
      embedContainer.appendChild(iframe);
      
      // Replace the text node with the embed
      const span = document.createElement('span');
      const beforeText = text.substring(0, text.indexOf(matchedUrl));
      const afterText = text.substring(text.indexOf(matchedUrl) + matchedUrl.length);
      
      if (beforeText) {
        span.appendChild(document.createTextNode(beforeText));
      }
      span.appendChild(embedContainer);
      if (afterText) {
        span.appendChild(document.createTextNode(afterText));
      }
      
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

function typesetMath(element) {
  // Wait for MathJax to be ready
  const checkMathJax = () => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([element])
        .catch(err => console.error('MathJax error:', err));
    } else if (window.MathJax && window.MathJax.startup) {
      // MathJax is loading, wait for it
      window.MathJax.startup.promise.then(() => {
        window.MathJax.typesetPromise([element])
          .catch(err => console.error('MathJax error:', err));
      });
    } else {
      // MathJax hasn't loaded yet, try again
      setTimeout(checkMathJax, 100);
    }
  };
  checkMathJax();
}

function executeScripts(container) {
  // Find all script tags in the container
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent = oldScript.textContent;
    }
    // Copy attributes
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    // Replace the old script with the new one (this executes it)
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

function convertUrlsToLinks(container) {
  // Regular expression to match URLs (http://, https://, and doi.org URLs)
  const urlRegex = /(https?:\/\/[^\s<>"']+|doi\.org\/[^\s<>"']+)/gi;
  
  // Walk through all text nodes in the bibliography
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip text nodes inside links, scripts, styles, code blocks
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tagName = parent.tagName;
        if (tagName === 'A' || tagName === 'SCRIPT' || tagName === 'STYLE' || 
            tagName === 'CODE' || tagName === 'PRE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    if (!urlRegex.test(text)) return;
    urlRegex.lastIndex = 0; // Reset regex
    
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    
    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
      }
      
      // Create link for the URL
      const link = document.createElement('a');
      let url = match[0];
      // If it's a doi.org URL without https://, add it
      if (url.startsWith('doi.org/')) {
        url = 'https://' + url;
      }
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = match[0];
      fragment.appendChild(link);
      
      lastIndex = urlRegex.lastIndex;
    }
    
    // Add remaining text after the last URL
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    // Replace the text node with the fragment
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

async function processCitationsFromServer(container, postSlug) {
  try {
    // Fetch pre-generated citations from server
    const response = await fetch('/citations.json');
    const allCitations = await response.json();
    
    const postCitations = allCitations[postSlug];
    if (!postCitations) {
      console.warn('No citations found for post:', postSlug);
      return;
    }
    
    // Replace citation markers with formatted citations
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.parentElement.tagName !== 'SCRIPT' && 
          node.parentElement.tagName !== 'STYLE' &&
          node.parentElement.tagName !== 'CODE' &&
          node.parentElement.tagName !== 'PRE') {
        textNodes.push(node);
      }
    }
    
    const citationRegex = /\[@([^\]]+)\]/g;
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const hasMatch = citationRegex.test(text);
      citationRegex.lastIndex = 0;
      
      if (hasMatch) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(citationRegex, (match, citationKeys) => {
          const keys = citationKeys.split(/[;,]/).map(k => k.trim().replace(/^@/, ''));
          const citations = keys.map(key => {
            const formatted = postCitations.inline[key];
            if (!formatted) return null;
            // Create link to bibliography entry
            return `<a href="#cite-${key}" class="citation-link">${formatted}</a>`;
          }).filter(Boolean);
          return citations.length > 0 ? `<cite>(${citations.join('; ')})</cite>` : match;
        });
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
    
    // Insert bibliography with anchor IDs
    const bibSection = container.querySelector('#bibliography');
    if (bibSection && postCitations.citations && postCitations.citations.trim().length > 0) {
      let bibHTML = postCitations.citations;
      
      // Add IDs to bibliography entries for linking
      postCitations.keys.forEach(key => {
        bibHTML = bibHTML.replace(
          `data-csl-entry-id="${key}"`,
          `data-csl-entry-id="${key}" id="cite-${key}"`
        );
      });
      
      bibSection.innerHTML = '<h2>References</h2>' + bibHTML;
      
      // Convert URLs to hyperlinks in the bibliography
      convertUrlsToLinks(bibSection);
    } else if (bibSection && postCitations.keys && postCitations.keys.length > 0) {
      // Bibliography div exists but citations string is empty - this might be a build issue
      // Still show the section header so user knows citations should be here
      console.warn('Bibliography div found but citations data is empty for post:', postSlug);
      bibSection.innerHTML = '<h2>References</h2><p><em>Citations are being processed...</em></p>';
    }
  } catch (error) {
    console.error('Citation processing error:', error);
  }
}

async function loadLibraries(libs) {
  const libraryURLs = {
    'd3': 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
    'plotly': 'https://cdn.jsdelivr.net/npm/plotly.js-dist@2/plotly.min.js',
    'observable-plot': 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/dist/plot.umd.min.js'
    // citation is pre-loaded in post.html
  };
  
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log('Script onload fired for:', src);
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };
  
  for (const lib of libs) {
    if (libraryURLs[lib]) {
      try {
        await loadScript(libraryURLs[lib]);
        console.log(`Loaded library: ${lib}`);
      } catch (error) {
        console.error(`Failed to load library ${lib}:`, error);
      }
    }
  }
}

