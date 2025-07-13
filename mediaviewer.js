class MediaViewer {
  constructor(postComponent) {
    this.postComponent = postComponent;
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
  }

  show(mediaItems, startIndex = 0) {
    if (!mediaItems || !mediaItems.length) return;
    
    this.mediaViewer = document.createElement('div');
    this.mediaViewer.className = 'media-viewer-overlay';
    this.currentMediaIndex = startIndex;
    
    const closeBtn = this.createCloseButton();
    const mediaContainer = this.createMediaContainer(mediaItems);
    
    this.mediaViewer.appendChild(closeBtn);
    this.mediaViewer.appendChild(mediaContainer);
    
    document.body.appendChild(this.mediaViewer);
    document.body.style.overflow = 'hidden';
    
    this.playCurrentVideo(mediaItems);
  }

  createCloseButton() {
    const closeBtn = document.createElement('div');
    closeBtn.className = 'media-viewer-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.close());
    return closeBtn;
  }

  createMediaContainer(mediaItems) {
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-viewer-container';
    
    mediaContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    mediaContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    mediaContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
    mediaContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
    
    const mediaContent = this.createMediaContent(mediaItems);
    mediaContainer.appendChild(mediaContent);
    
    if (mediaItems.length > 1) {
      mediaContainer.appendChild(this.createNavButton(-1));
      mediaContainer.appendChild(this.createNavButton(1));
      mediaContainer.appendChild(this.createDots(mediaItems));
    }
    
    return mediaContainer;
  }

  createMediaContent(mediaItems) {
    const mediaContent = document.createElement('div');
    mediaContent.className = 'media-viewer-content';
    
    mediaItems.forEach((media, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = `media-viewer-item ${index === this.currentMediaIndex ? 'active' : ''}`;
      
      if (media.media_type === 'video') {
        mediaItem.appendChild(this.createVideoElement(media));
      } else {
        mediaItem.appendChild(this.createImageElement(media));
      }
      
      mediaContent.appendChild(mediaItem);
    });
    
    return mediaContent;
  }

  createVideoElement(media) {
    const video = document.createElement('video');
    video.className = 'media-viewer-video';
    video.setAttribute('controls', '');
    video.innerHTML = `<source src="${media.media_url}" type="video/mp4">`;
    return video;
  }

  createImageElement(media) {
    const img = document.createElement('img');
    img.className = 'media-viewer-image';
    img.src = media.media_url;
    return img;
  }

  createNavButton(direction) {
    const btn = document.createElement('div');
    btn.className = `media-viewer-nav media-viewer-${direction === -1 ? 'prev' : 'next'}`;
    btn.innerHTML = `<i class="fas fa-chevron-${direction === -1 ? 'left' : 'right'}"></i>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigate(direction);
    });
    return btn;
  }

  createDots(mediaItems) {
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'media-viewer-dots';
    
    mediaItems.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.className = `media-viewer-dot ${index === this.currentMediaIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goTo(index));
      dotsContainer.appendChild(dot);
    });
    
    return dotsContainer;
  }

  close() {
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

  navigate(direction) {
    const mediaItems = this.mediaViewer.querySelectorAll('.media-viewer-item');
    if (!mediaItems.length) return;
    
    const newIndex = (this.currentMediaIndex + direction + mediaItems.length) % mediaItems.length;
    this.goTo(newIndex);
  }

  goTo(index) {
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
    
    this.playCurrentVideo();
  }

  playCurrentVideo() {
    const mediaItems = this.mediaViewer?.querySelectorAll('.media-viewer-item');
    if (!mediaItems) return;
    
    const newVideo = mediaItems[this.currentMediaIndex]?.querySelector('video');
    if (newVideo) {
      newVideo.currentTime = 0;
      newVideo.play().catch(e => console.log('Video play error:', e));
    }
  }

  handleTouchStart(e) {
    if (!this.mediaViewer) return;
    this.startY = e.touches[0].clientY;
    this.startX = e.touches[0].clientX;
    this.isDragging = false;
  }

  handleTouchMove(e) {
    if (!this.mediaViewer || !this.startY) return;
    
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = y - this.startY;
    const dx = x - this.startX;
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      e.preventDefault();
      this.isDragging = true;
      if (dx > 0) {
        this.navigate(-1);
      } else {
        this.navigate(1);
      }
      this.startX = x;
      return;
    }
    
    if (Math.abs(dy) > 30) {
      e.preventDefault();
      this.isDragging = true;
      const opacity = 1 - Math.min(Math.abs(dy) / 200, 0.8);
      const scale = 1 - Math.min(Math.abs(dy) / 1000, 0.1);
      
      const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
      mediaContainer.style.transform = `translateY(${dy}px) scale(${scale})`;
      mediaContainer.style.opacity = opacity;
    }
  }

  handleTouchEnd(e) {
    if (!this.mediaViewer || !this.isDragging) return;
    
    const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
    const y = e.changedTouches[0].clientY;
    const dy = y - this.startY;
    
    if (Math.abs(dy) > 100) {
      this.close();
    } else {
      mediaContainer.style.transform = '';
      mediaContainer.style.opacity = '';
    }
    
    this.startY = 0;
    this.startX = 0;
    this.isDragging = false;
  }

  handleMouseDown(e) {
    if (!this.mediaViewer) return;
    this.startY = e.clientY;
    this.startX = e.clientX;
    this.isDragging = false;
    
    const handleMouseMove = (e) => {
      const y = e.clientY;
      const dy = y - this.startY;
      
      if (Math.abs(dy) > 30) {
        this.isDragging = true;
        const opacity = 1 - Math.min(Math.abs(dy) / 200, 0.8);
        const scale = 1 - Math.min(Math.abs(dy) / 1000, 0.1);
        
        const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
        mediaContainer.style.transform = `translateY(${dy}px) scale(${scale})`;
        mediaContainer.style.opacity = opacity;
      }
    };
    
    const handleMouseUp = (e) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (!this.isDragging) return;
      
      const y = e.clientY;
      const dy = y - this.startY;
      
      if (Math.abs(dy) > 100) {
        this.close();
      } else {
        const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
        mediaContainer.style.transform = '';
        mediaContainer.style.opacity = '';
      }
      
      this.startY = 0;
      this.startX = 0;
      this.isDragging = false;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}
