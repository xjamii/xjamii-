class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isRefreshing = false;
    this.isLoadingMore = false;
    this.viewCounted = false;
    this.observer = new IntersectionObserver(this.handleIntersect.bind(this), {
      threshold: 0.5,
      rootMargin: '0px 0px -100px 0px'
    });
  }

  connectedCallback() {
    this.render();
    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.unobserve(this);
    }
  }

  static get observedAttributes() {
    return ['post-data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'post-data' && oldValue !== newValue) {
      this.render();
    }
  }

  // Methods will be imported from other files
}

// Import all functionality
import { handleIntersect, recordView } from './post-views.js';
import { render, processContent, getInitials, formatTime } from './post-render.js';
import { renderMedia, showMediaViewer, closeMediaViewer, navigateMedia, goToMedia } from './post-media.js';
import { toggleLike, checkLikeStatus, sharePost, copyToClipboard, showMoreOptions } from './post-interactions.js';
import { openCommentPage, setupCommentPageEventListeners, renderMediaForCommentPage } from './post-comments.js';
import { setupEventListeners } from './post-events.js';
import { setupPullToRefresh } from './post-utils.js';

// Assign methods to prototype
Object.assign(PostComponent.prototype, {
  handleIntersect,
  recordView,
  render,
  processContent,
  getInitials,
  formatTime,
  renderMedia,
  showMediaViewer,
  closeMediaViewer,
  navigateMedia,
  goToMedia,
  toggleLike,
  checkLikeStatus,
  sharePost,
  copyToClipboard,
  showMoreOptions,
  openCommentPage,
  setupCommentPageEventListeners,
  renderMediaForCommentPage,
  setupEventListeners,
  setupPullToRefresh
});

customElements.define('post-component', PostComponent);
