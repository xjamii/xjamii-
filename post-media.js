export function renderMedia(mediaItems) {
  if (!mediaItems || !mediaItems.length) return '';
  
  if (mediaItems.length === 1) {
    const media = mediaItems[0];
    if (media.media_type === 'video') {
      return `
        <div class="media-container video-container">
          <div class="video-preview" data-media-index="0">
            <video class="post-media" preload="metadata">
              <source src="${media.media_url}" type="video/mp4">
            </video>
            <div class="video-play-button"><i class="fas fa-play"></i></div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="media-container">
          <img src="${media.media_url}" class="post-media" data-media-index="0">
        </div>
      `;
    }
  }
  
  return `
    <div class="media-grid">
      ${mediaItems.slice(0, 4).map((media, index) => `
        <div class="grid-media-container">
          ${media.media_type === 'video' 
            ? `<div class="video-preview" data-media-index="${index}">
                <video class="grid-media" preload="metadata">
                  <source src="${media.media_url}" type="video/mp4">
                </video>
                <div class="video-play-button"><i class="fas fa-play"></i></div>
              </div>`
            : `<img src="${media.media_url}" class="grid-media" data-media-index="${index}">`}
        </div>
      `).join('')}
      ${mediaItems.length > 4 ? `
        <div class="media-count-overlay">
          +${mediaItems.length - 4}
        </div>` : ''}
    </div>
  `;
}

export function showMediaViewer(mediaItems, startIndex = 0) {
  if (!mediaItems || !mediaItems.length) return;
  
  this.mediaViewer = document.createElement('div');
  this.mediaViewer.className = 'media-viewer-overlay';
  this.currentMediaIndex = startIndex;
  
  const closeBtn = document.createElement('div');
  closeBtn.className = 'media-viewer-close';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.addEventListener('click', () => this.closeMediaViewer());
  
  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'media-viewer-container';
  mediaContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
  mediaContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
  mediaContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
  mediaContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
  
  const mediaContent = document.createElement('div');
  mediaContent.className = 'media-viewer-content';
  
  mediaItems.forEach((media, index) => {
    const mediaItem = document.createElement('div');
    mediaItem.className = `media-viewer-item ${index === startIndex ? 'active' : ''}`;
    
    if (media.media_type === 'video') {
      const video = document.createElement('video');
      video.className = 'media-viewer-video';
      video.setAttribute('controls', '');
      video.innerHTML = `<source src="${media.media_url}" type="video/mp4">`;
      mediaItem.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.className = 'media-viewer-image';
      img.src = media.media_url;
      mediaItem.appendChild(img);
    }
    
    mediaContent.appendChild(mediaItem);
  });
  
  let prevBtn, nextBtn;
  if (mediaItems.length > 1) {
    prevBtn = document.createElement('div');
    prevBtn.className = 'media-viewer-nav media-viewer-prev';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateMedia(-1);
    });
    
    nextBtn = document.createElement('div');
    nextBtn.className = 'media-viewer-nav media-viewer-next';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateMedia(1);
    });
  }
  
  let dotsContainer;
  if (mediaItems.length > 1) {
    dotsContainer = document.createElement('div');
    dotsContainer.className = 'media-viewer-dots';
    
    mediaItems.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.className = `media-viewer-dot ${index === startIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goToMedia(index));
      dotsContainer.appendChild(dot);
    });
  }
  
  mediaContainer.appendChild(mediaContent);
  if (prevBtn) mediaContainer.appendChild(prevBtn);
  if (nextBtn) mediaContainer.appendChild(nextBtn);
  if (dotsContainer) mediaContainer.appendChild(dotsContainer);
  
  this.mediaViewer.appendChild(closeBtn);
  this.mediaViewer.appendChild(mediaContainer);
  
  document.body.appendChild(this.mediaViewer);
  document.body.style.overflow = 'hidden';
  
  if (mediaItems[startIndex]?.media_type === 'video') {
    setTimeout(() => {
      const video = this.mediaViewer.querySelector('.media-viewer-item.active video');
      if (video) video.play().catch(e => console.log('Video play error:', e));
    }, 300);
  }
}

export function closeMediaViewer() {
  if (!this.mediaViewer) return;
  
  const videos = this.mediaViewer.querySelectorAll('video');
  videos.forEach(video => video.pause());
  
  this.mediaViewer.classList.add('closing');
  setTimeout(() => {
    this.mediaViewer.remove();
    this.mediaViewer = null;
    document.body.style.overflow = '';
  }, 300);
}

export function navigateMedia(direction) {
  const mediaItems = this.mediaViewer.querySelectorAll('.media-viewer-item');
  if (!mediaItems.length) return;
  
  const newIndex = (this.currentMediaIndex + direction + mediaItems.length) % mediaItems.length;
  this.goToMedia(newIndex);
}

export function goToMedia(index) {
  const mediaItems = this.mediaViewer?.querySelectorAll('.media-viewer-item');
  if (!mediaItems || index < 0 || index >= mediaItems.length) return;
  
  const currentVideo = mediaItems[this.currentMediaIndex]?.querySelector('video');
  if (currentVideo) currentVideo.pause();
  
  mediaItems[this.currentMediaIndex]?.classList.remove('active');
  mediaItems[index].classList.add('active');
  this.currentMediaIndex = index;
  
  const dots = this.mediaViewer?.querySelectorAll('.media-viewer-dot');
  if (dots) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }
  
  const newVideo = mediaItems[index]?.querySelector('video');
  if (newVideo) {
    newVideo.currentTime = 0;
    newVideo.play().catch(e => console.log('Video play error:', e));
  }
}

export function renderMediaForCommentPage(mediaItems) {
  if (!mediaItems || !mediaItems.length) return '';
  
  if (mediaItems.length === 1) {
    const media = mediaItems[0];
    if (media.media_type === 'video') {
      return `
        <div class="media-container video-container">
          <div class="video-preview" data-media-index="0">
            <video class="post-media" preload="metadata">
              <source src="${media.media_url}" type="video/mp4">
            </video>
            <div class="video-play-button"><i class="fas fa-play"></i></div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="media-container">
          <img src="${media.media_url}" class="post-media" data-media-index="0">
        </div>
      `;
    }
  }
  
  return `
    <div class="media-grid">
      ${mediaItems.slice(0, 4).map((media, index) => `
        <div class="grid-media-container">
          ${media.media_type === 'video' 
            ? `<div class="video-preview" data-media-index="${index}">
                <video class="grid-media" preload="metadata">
                  <source src="${media.media_url}" type="video/mp4">
                </video>
                <div class="video-play-button"><i class="fas fa-play"></i></div>
              </div>`
            : `<img src="${media.media_url}" class="grid-media" data-media-index="${index}">`}
        </div>
      `).join('')}
      ${mediaItems.length > 4 ? `
        <div class="media-count-overlay">
          +${mediaItems.length - 4}
        </div>` : ''}
    </div>
  `;
}
