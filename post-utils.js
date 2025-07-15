export function setupPullToRefresh() {
  let startY = 0;
  let touchStart = false;
  const refreshContainer = document.createElement('div');
  refreshContainer.className = 'refresh-container';
  refreshContainer.innerHTML = '<div class="refresh-loader"><i class="fas fa-sync-alt"></i></div>';
  this.parentNode.insertBefore(refreshContainer, this);

  this.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0 && !this.isRefreshing) {
      startY = e.touches[0].pageY;
      touchStart = true;
    }
  }, { passive: true });

  this.addEventListener('touchmove', (e) => {
    if (!touchStart || this.isRefreshing) return;
    
    const y = e.touches[0].pageY;
    const dy = y - startY;
    
    if (dy > 0) {
      e.preventDefault();
      const pullDistance = Math.min(dy, 150);
      const progress = Math.min(pullDistance / 150, 1);
      refreshContainer.style.opacity = progress;
      refreshContainer.style.transform = `translateY(${pullDistance}px)`;
      refreshContainer.querySelector('.refresh-loader').style.transform = `rotate(${progress * 360}deg)`;
    }
  }, { passive: false });

  this.addEventListener('touchend', (e) => {
    if (!touchStart || this.isRefreshing) return;
    
    const y = e.changedTouches[0].pageY;
    const dy = y - startY;
    
    if (dy > 100) {
      this.isRefreshing = true;
      refreshContainer.classList.add('refreshing');
      
      setTimeout(() => {
        refreshContainer.style.transform = 'translateY(0)';
        refreshContainer.classList.remove('refreshing');
        this.isRefreshing = false;
        console.log('Refreshing content...');
      }, 1000);
    } else {
      refreshContainer.style.transform = 'translateY(0)';
      refreshContainer.style.opacity = '0';
    }
    
    touchStart = false;
  });
}
