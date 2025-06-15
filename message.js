// message.js - Standalone Text Messaging System
document.addEventListener('DOMContentLoaded', () => {
    // Firebase Configuration (must match your project)
    const firebaseConfig = {
        apiKey: "AIzaSyC3wBG1yIxl3FB4oVp-7rDGlj_LE3SP2b8",
        authDomain: "x-jamii.firebaseapp.com",
        projectId: "x-jamii",
        storageBucket: "x-jamii.appspot.com",
        messagingSenderId: "927548667044",
        appId: "1:927548667044:web:835e597909f51a2e4da231",
        measurementId: "G-9S45DQ04HZ"
    };

    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // Use already initialized app
    }
    
    // Firebase services
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // DOM Elements
    const messagePage = document.querySelector('.message-page');
    const messageBackBtn = document.querySelector('.message-back');
    const messageName = document.querySelector('.message-name');
    const messageUsername = document.querySelector('.message-username');
    const messageContent = document.querySelector('.message-content');
    const messageEmpty = document.querySelector('.message-empty');
    const messageInput = document.querySelector('.message-input');
    const messageSendBtn = document.querySelector('.message-send');
    const skeletonLoading = document.querySelector('.skeleton-loading');
    const scrollLoading = document.querySelector('.scroll-loading');

    // State
    let currentConversation = null;
    let currentUser = null;
    let recipientUser = null;
    let isLoading = false;
    let isScrollLoading = false;
    let lastVisible = null;
    let hasMoreMessages = true;

    // Initialize messaging system
    function init() {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                setupEventListeners();
            } else {
                // Optional: Redirect to login if needed
                // window.location.href = 'login.html';
            }
        });
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Navigation
        messageBackBtn.addEventListener('click', closeMessagePage);

        // Message sending
        messageSendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Global message button handler (for buttons in other files)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#message-btn')) {
                const btn = e.target.closest('#message-btn');
                if (btn.dataset.user) {
                    const userData = JSON.parse(btn.dataset.user);
                    openMessagePage(userData);
                }
            }
        });
    }

    // Open message page with a specific user
    function openMessagePage(profileUser) {
        if (!currentUser) return;
        
        // Show skeleton loading
        skeletonLoading.style.display = 'block';
        messageEmpty.style.display = 'none';
        messageContent.innerHTML = '';
        
        recipientUser = profileUser;
        
        // Set recipient info (preserving your exact style)
        messageName.innerHTML = `
            ${profileUser.displayName}
            ${profileUser.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
        `;
        messageUsername.textContent = `@${profileUser.username}`;

        // UI Setup
        messagePage.style.display = 'block';
        document.body.style.overflow = 'hidden';
        messageInput.focus();
        messageInput.value = '';
        
        // Load conversation after a slight delay to show skeleton
        setTimeout(() => {
            loadMessages();
        }, 300);
    }

    // Close message page
    function closeMessagePage() {
        messagePage.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Cleanup listeners
        if (currentConversation) {
            currentConversation();
            currentConversation = null;
        }
        
        // Reset UI
        messageContent.innerHTML = '';
        messageEmpty.style.display = 'flex';
        messageInput.value = '';
        recipientUser = null;
        skeletonLoading.style.display = 'none';
        scrollLoading.style.display = 'none';
    }

    // Load messages for current conversation
    function loadMessages() {
        if (!currentUser || !recipientUser || isLoading) return;

        isLoading = true;
        hasMoreMessages = true;
        
        // Clear previous listener to avoid duplicates
        if (currentConversation) {
            currentConversation();
        }

        // Real-time listener for messages
        currentConversation = db.collection('messages')
            .where('participants', 'array-contains', currentUser.uid)
            .where('participants', 'array-contains', recipientUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(15)
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    skeletonLoading.style.display = 'none';
                    messageEmpty.style.display = 'flex';
                    isLoading = false;
                    return;
                }

                // Store the last visible document for pagination
                lastVisible = snapshot.docs[snapshot.docs.length - 1];
                
                // Process messages in reverse order (oldest first)
                const messages = [];
                snapshot.forEach(doc => {
                    messages.unshift(doc.data());
                });

                // Clear and render messages
                messageContent.innerHTML = '';
                messages.forEach(message => addMessageToUI(message));
                
                skeletonLoading.style.display = 'none';
                messageEmpty.style.display = 'none';
                isLoading = false;
                scrollToBottom();
                
                // Set up scroll listener for infinite loading
                setupInfiniteScroll();
            }, error => {
                console.error("Error loading messages:", error);
                skeletonLoading.style.display = 'none';
                showError("Failed to load messages. Please try again.");
                isLoading = false;
            });
    }

    // Set up infinite scroll loading
    function setupInfiniteScroll() {
        messageContent.addEventListener('scroll', async () => {
            if (isScrollLoading || !hasMoreMessages || !lastVisible) return;
            
            // Check if we're near the top
            if (messageContent.scrollTop < 100) {
                isScrollLoading = true;
                scrollLoading.style.display = 'block';
                
                try {
                    const next = await db.collection('messages')
                        .where('participants', 'array-contains', currentUser.uid)
                        .where('participants', 'array-contains', recipientUser.uid)
                        .orderBy('timestamp', 'desc')
                        .startAfter(lastVisible)
                        .limit(10)
                        .get();

                    if (next.empty) {
                        hasMoreMessages = false;
                    } else {
                        lastVisible = next.docs[next.docs.length - 1];
                        
                        // Store current scroll position
                        const oldHeight = messageContent.scrollHeight;
                        const oldScroll = messageContent.scrollTop;
                        
                        // Add new messages to the top
                        next.forEach(doc => {
                            addMessageToUI(doc.data(), true);
                        });
                        
                        // Restore scroll position
                        const newHeight = messageContent.scrollHeight;
                        messageContent.scrollTop = oldScroll + (newHeight - oldHeight);
                    }
                } catch (error) {
                    console.error("Error loading more messages:", error);
                    showError("Failed to load more messages");
                } finally {
                    isScrollLoading = false;
                    scrollLoading.style.display = 'none';
                }
            }
        });
    }

    // Display a message in the UI (updated to support prepending)
    function addMessageToUI(message, prepend = false) {
        const isSender = message.senderId === currentUser.uid;
        const messageTime = formatTime(message.timestamp?.toDate());
        
        const messageEl = document.createElement('div');
        messageEl.className = `message-bubble ${isSender ? 'sent' : 'received'}`;
        messageEl.innerHTML = `
            <div class="message-text">${message.content}</div>
            <div class="message-time">${messageTime}</div>
        `;
        
        if (prepend) {
            messageContent.insertBefore(messageEl, messageContent.firstChild);
        } else {
            messageContent.appendChild(messageEl);
        }
    }

    // Show error message
    function showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        
        // Remove any existing error
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        messageContent.appendChild(errorEl);
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorEl.remove();
        }, 5000);
    }

    // Send a new text message
    async function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !currentUser || !recipientUser) return;

        try {
            // Create message document in Firestore
            await db.collection('messages').add({
                content: content,
                senderId: currentUser.uid,
                recipientId: recipientUser.uid,
                participants: [currentUser.uid, recipientUser.uid],
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });

            // Clear input
            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message:", error);
            showError('Failed to send message. Please try again.');
        }
    }

    // Format timestamp (e.g. "2:30 PM")
    function formatTime(date) {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Auto-scroll to newest message
    function scrollToBottom() {
        messageContent.scrollTop = messageContent.scrollHeight;
    }

    // Make openMessagePage available globally
    window.openMessagePage = openMessagePage;

    // Start the messaging system
    init();
});