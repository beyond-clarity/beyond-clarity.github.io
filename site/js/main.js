// Load and display post list from posts/index.json
async function loadPosts() {
  const postListEl = document.getElementById('post-list');
  
  try {
    const response = await fetch('/posts/index.json');
    const posts = await response.json();
    
    if (!posts || posts.length === 0) {
      postListEl.innerHTML = '<p>No posts yet.</p>';
      return;
    }
    
    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Render post list
    postListEl.innerHTML = posts.map(post => `
      <div class="post-item">
        <h3><a href="${post.permalink}">${post.title}</a></h3>
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
        </div>
        ${post.tags && post.tags.length > 0 ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading posts:', error);
    postListEl.innerHTML = '<p>Error loading posts. Please try again later.</p>';
  }
}

// Load and display draft articles (only available in development)
async function loadDrafts() {
  try {
    const response = await fetch('/drafts/index.json');
    if (!response.ok) return; // Drafts not available (production mode)
    
    const drafts = await response.json();
    if (!drafts || drafts.length === 0) return;
    
    // Sort by date (newest first)
    drafts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create drafts section before the post list
    const postListEl = document.getElementById('post-list');
    const draftsSection = document.createElement('div');
    draftsSection.className = 'drafts-section';
    draftsSection.innerHTML = `
      <h2 style="color: #e67e22; margin-top: 2rem;">📝 Draft Articles (Development Only)</h2>
      <p style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 1rem;">
        These articles are works in progress and won't appear in production.
      </p>
      ${drafts.map(draft => `
        <div class="post-item" style="border-left: 3px solid #e67e22; padding-left: 1rem;">
          <h3><a href="${draft.permalink}?draft=true">${draft.title}</a> <span style="color: #e67e22; font-size: 0.8em;">[DRAFT]</span></h3>
          <div class="post-meta">
            <time datetime="${draft.date}">${formatDate(draft.date)}</time>
          </div>
          ${draft.tags && draft.tags.length > 0 ? `
            <div class="post-tags">
              ${draft.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
      <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ecf0f1;">
      <h2>Published Articles</h2>
    `;
    
    postListEl.parentNode.insertBefore(draftsSection, postListEl);
  } catch (error) {
    // Silently fail - drafts are optional
    console.log('Drafts not available (production mode)');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Check if current URL is a valid post (for 404 detection)
async function checkIfInvalidPost() {
  const pathname = window.location.pathname;
  
  // Only check if we're not on homepage
  if (pathname === '/' || pathname === '') {
    return true; // Homepage is valid
  }
  
    // Extract permalink (normalize to match JSON format with leading/trailing slashes)
    const permalink = pathname.endsWith('/') ? pathname : `${pathname}/`;
    
    if (permalink === '/' || permalink === '') {
      return true; // Empty permalink means homepage
    }
    
    try {
      // Load posts index to check if permalink exists
      const response = await fetch('/posts/index.json');
      if (!response.ok) return true; // Can't check, assume valid
      
      const postsText = await response.text();
      console.log('Fetched posts:', postsText.substring(0, 100));
      let posts;
      try {
        posts = JSON.parse(postsText);
      } catch (e) {
        console.error('Failed to parse posts JSON:', e, 'Response:', postsText);
        return;
      }
      
      const post = posts.find(p => p.permalink === permalink);
    
    // If not found in posts, check drafts (dev only)
    if (!post) {
      const draftResponse = await fetch('/drafts/index.json');
      if (draftResponse.ok) {
        const draftsText = await draftResponse.text();
        try {
          const drafts = JSON.parse(draftsText);
          const draft = drafts.find(d => d.permalink === permalink);
          if (draft) {
            return; // Valid draft post
          }
        } catch (e) {
          console.error('Failed to parse drafts JSON:', e);
        }
      }
      
      // Not found in either - show 404
      console.log(`Invalid post URL: ${permalink}`);
      document.body.innerHTML = `
        <main class="fullwidth" id="maincontent">
          <article>
            <h1>404 - Post Not Found</h1>
            <p>
              The post at <code>${pathname}</code> could not be found.
            </p>
            <p>
              <a href="/">← Back to homepage</a>
            </p>
          </article>
        </main>
      `;
      return false; // Indicate 404 was shown
    }
  } catch (error) {
    console.error('Error checking post validity:', error);
  }
  
  return true; // Valid post or unknown
}

// Load posts when page loads
document.addEventListener('DOMContentLoaded', async () => {
  // First check if this is an invalid post URL
  const isValid = await checkIfInvalidPost();
  
  if (!isValid) {
    return; // 404 was shown, don't load posts
  }
  
  // Otherwise load homepage content
  await loadDrafts(); // Load drafts first (if available)
  await loadPosts();  // Then load published posts
});

