class PostMediaViewer extends HTMLElement {
  constructor() {
    super();
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isDragging = false;
  }

  show(mediaItems, startIndex = 0) {
    if (!mediaItems || !mediaItems.length) return;
    
    this.currentMediaIndex = startIndex;
    this.innerHTML = '';
    
    // Create close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'media-viewer-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.close());
    
    // Create media container
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-viewer-container';
    
    // Add touch and mouse events
    mediaContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    mediaContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    mediaContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
    mediaContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
    
    // Create media content
    const mediaContent = document.createElement('div');
    mediaContent.className = 'media-viewer-content';
    
    // Add media items
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
    
    // Add navigation arrows if multiple items
    let prevBtn, nextBtn;
    if (mediaItems.length > 1) {
      prevBtn = document.createElement('div');
      prevBtn.className = 'media-viewer-nav media-viewer-prev';
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navigate(-1);
      });
      
      nextBtn = document.createElement('div');
      nextBtn.className = 'media-viewer-nav media-viewer-next';
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navigate(1);
      });
    }
    
    // Add dots indicator if multiple items
    let dotsContainer;
    if (mediaItems.length > 1) {
      dotsContainer = document.createElement('div');
      dotsContainer.className = 'media-viewer-dots';
      
      mediaItems.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `media-viewer-dot ${index === startIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => this.goTo(index));
        dotsContainer.appendChild(dot);
      });
    }
    
    // Assemble the viewer
    mediaContainer.appendChild(mediaContent);
    if (prevBtn) mediaContainer.appendChild(prevBtn);
    if (nextBtn) mediaContainer.appendChild(nextBtn);
    if (dotsContainer) mediaContainer.appendChild(dotsContainer);
    
    this.appendChild(closeBtn);
    this.appendChild(mediaContainer);
    
    document.body.appendChild(this);
    document.body.style.overflow = 'hidden';
    
    // Start playing video if the first item is a video
    if (mediaItems[startIndex]?.media_type === 'video') {
      setTimeout(() => {
        const video = this.querySelector('.media-viewer-item.active video');
        if (video) video.play().catch(e => console.log('Video play error:', e));
      }, 300);
    }
  }

  close() {
    const videos = this.querySelectorAll('video');
    videos.forEach(video => video.pause());
    
    this.classList.add('closing');
    setTimeout(() => {
      this.remove();
      document.body.style.overflow = '';
    }, 300);
  }

  navigate(direction) {
    const mediaItems = this.querySelectorAll('.media-viewer-item');
    if (!mediaItems.length) return;
    
    const newIndex = (this.currentMediaIndex + direction + mediaItems.length) % mediaItems.length;
    this.goTo(newIndex);
  }

  goTo(index) {
    const mediaItems = this.querySelectorAll('.media-viewer-item');
    if (!mediaItems || index < 0 || index >= mediaItems.length) return;
    
    const currentVideo = mediaItems[this.currentMediaIndex]?.querySelector('video');
    if (currentVideo) currentVideo.pause();
    
    mediaItems[this.currentMediaIndex]?.classList.remove('active');
    mediaItems[index].classList.add('active');
    this.currentMediaIndex = index;
    
    const dots = this.querySelectorAll('.media-viewer-dot');
    if (dots) {
      dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    }
    
    const newVideo = mediaItems[index]?.querySelector('video');
    if (newVideo) {
      newVideo.currentTime = 0;
      newVideo.play().catch(e => console.log('Video play error:', e));
    }
  }

  handleTouchStart(e) {
    this.startY = e.touches[0].clientY;
    this.startX = e.touches[0].clientX;
    this.isDragging = false;
  }

  handleTouchMove(e) {
    if (!this.startY) return;
    
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = y - this.startY;
    const dx = x - this.startX;
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      e.preventDefault();
      this.isDragging = true;
      if (dx > 0) this.navigate(-1);
      else this.navigate(1);
      this.startX = x;
      return;
    }
    
    if (Math.abs(dy) > 30) {
      e.preventDefault();
      this.isDragging = true;
      const opacity = 1 - Math.min(Math.abs(dy) / 200, 0.8);
      const scale = 1 - Math.min(Math.abs(dy) / 1000, 0.1);
      
      const mediaContainer = this.querySelector('.media-viewer-container');
      mediaContainer.style.transform = `translateY(${dy}px) scale(${scale})`;
      mediaContainer.style.opacity = opacity;
    }
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    const mediaContainer = this.querySelector('.media-viewer-container');
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
        
        const mediaContainer = this.querySelector('.media-viewer-container');
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
        const mediaContainer = this.querySelector('.media-viewer-container');
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

customElements.define('post-media-viewer', PostMediaViewer);
