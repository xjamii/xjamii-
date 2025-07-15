export function handleIntersect(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting && !this.viewCounted) {
      this.recordView();
    }
  });
}

export async function recordView() {
  const postData = this.getAttribute('post-data');
  if (!postData) return;
  
  try {
    const post = JSON.parse(postData);
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (!this.isConnected || !this.viewCounted) {
      const { error } = await supabase
        .rpc('increment_views', { post_id: post.id });
      
      if (!error) {
        this.viewCounted = true;
        console.log("✅ View counted for post:", post.id);
        
        const viewsEl = this.querySelector('.views');
        if (viewsEl) {
          const icon = viewsEl.querySelector('i');
          const countSpan = viewsEl.querySelector('span') || document.createElement('span');
          const currentViews = parseInt(countSpan.textContent || viewsEl.textContent) || 0;
          
          const container = document.createElement('div');
          container.className = 'view-counter-animation';
          container.style.cssText = `
            display: inline-flex;
            flex-direction: column;
            overflow: hidden;
            height: 20px;
            vertical-align: middle;
          `;
          
          const oldNumber = document.createElement('div');
          oldNumber.textContent = currentViews;
          
          const newNumber = document.createElement('div');
          newNumber.textContent = currentViews + 1;
          
          container.appendChild(oldNumber);
          container.appendChild(newNumber);
          
          viewsEl.innerHTML = '';
          viewsEl.appendChild(icon);
          viewsEl.appendChild(container);
          
          setTimeout(() => {
            container.style.transform = `translateY(-20px)`;
            container.style.transition = `transform 0.3s ease-out`;
          }, 50);
          
          setTimeout(() => {
            if (viewsEl.isConnected) {
              viewsEl.innerHTML = `
                <i class="fas fa-chart-bar"></i>
                <span>${currentViews + 1}</span>
              `;
            }
          }, 800);
        }
      }
    }
  } catch (err) {
    console.error("View recording failed:", err);
  }
}
