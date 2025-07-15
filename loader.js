// loader.js
const scripts = [
    'post-utils.js',
    'post-views.js',
    'post-render.js',
    'post-media.js',
    'post-interactions.js',
    'post-comments.js',
    'post-events.js',
    'post-component.js'
];

function loadScripts() {
    if (scripts.length === 0) return;
    
    const script = document.createElement('script');
    script.src = scripts.shift();
    script.onload = loadScripts;
    script.onerror = () => console.error(`Failed to load ${script.src}`);
    document.body.appendChild(script);
}

loadScripts();
