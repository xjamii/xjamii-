// Initialize Firebase
  const firebaseConfig = {
  apiKey: "AIzaSyC3wBG1yIxl3FB4oVp-7rDGlj_LE3SP2b8",
  authDomain: "x-jamii.firebaseapp.com",
  projectId: "x-jamii",
  storageBucket: "x-jamii.firebasestorage.app",    // <- DIFFERENT
  messagingSenderId: "927548667044",
  appId: "1:927548667044:web:835e597909f51a2e4da231",
  measurementId: "G-9S45DQ04HZ"
};


if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Pagination variables
let lastVisibleUser = null;
let isLoading = false;
let allUsersLoaded = false;
let currentFollowingIds = [];

// Function to fetch user suggestions with pagination
async function fetchUserSuggestions(loadMore = false) {
    if (isLoading || allUsersLoaded) return;
    isLoading = true;

    try {
        const suggestionsScroll = document.getElementById('suggestionsScroll');
        if (loadMore) {
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'loading-spinner';
            loadingSpinner.innerHTML = '<div class="spinner"></div>';
            suggestionsScroll.appendChild(loadingSpinner);
        } else {
            suggestionsScroll.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        }

        const currentUserId = firebase.auth().currentUser?.uid;
        if (!currentUserId) throw new Error("No user logged in");

        if (currentFollowingIds.length === 0) {
            const followingSnapshot = await db.collection('users')
                .doc(currentUserId)
                .collection('following')
                .get();
            currentFollowingIds = followingSnapshot.docs.map(doc => doc.id);
        }

        let query = db.collection('users')
            .where('uid', 'not-in', [...currentFollowingIds, currentUserId])
            .orderBy('displayName')
            .limit(5);

        if (loadMore && lastVisibleUser) {
            query = query.startAfter(lastVisibleUser);
        }

        const usersSnapshot = await query.get();
        const spinner = document.querySelector('#suggestionsScroll .loading-spinner');
        if (spinner) spinner.remove();

        if (usersSnapshot.empty) {
            if (loadMore) {
                allUsersLoaded = true;
                if (document.querySelectorAll('.suggestion-item').length === 0) {
                    suggestionsScroll.innerHTML = '<p style="padding: 20px; color: #888;">No suggestions available</p>';
                }
            }
            return;
        }

        lastVisibleUser = usersSnapshot.docs[usersSnapshot.docs.length - 1];

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            suggestionsScroll.appendChild(createSuggestionCard(user));
        });

    } catch (error) {
        console.error("Error fetching suggestions:", error);
        const spinner = document.querySelector('#suggestionsScroll .loading-spinner');
        if (spinner) spinner.remove();
        
        const suggestionsScroll = document.getElementById('suggestionsScroll');
        if (!loadMore) {
            suggestionsScroll.innerHTML = '<p style="padding: 20px; color: #888;">Error loading suggestions</p>';
        }
    } finally {
        isLoading = false;
    }
}

// Function to create a suggestion card with all clickable profile elements
function createSuggestionCard(user) {
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'suggestion-item';
    
    const profileUrl = `/profile/${user.username}`;
    const names = user.displayName?.split(' ') || ['U'];
    const initials = names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}` 
        : names[0][0];
    
    const avatarImage = user.photoURL 
        ? `<img src="${user.photoURL}" alt="${user.displayName}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
        : initials;
    
    suggestionItem.innerHTML = `
        <div class="suggestion-avatar" onclick="navigateToProfile('${profileUrl}')">
            ${avatarImage}
        </div>
        <div class="suggestion-info">
            <div class="profile-link" onclick="navigateToProfile('${profileUrl}')">
                <div class="suggestion-name" onclick="navigateToProfile('${profileUrl}')">
                    ${user.displayName || 'User'} ${user.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                </div>
                <div class="suggestion-username" onclick="navigateToProfile('${profileUrl}')">@${user.username || 'user'}</div>
            </div>
        </div>
        <button class="suggestion-follow" onclick="followAccount(event, this, '${user.uid}')">Follow</button>
    `;

    // Add hover effects to clickable elements
    const clickableElements = suggestionItem.querySelectorAll('.suggestion-avatar, .suggestion-name, .suggestion-username');
    clickableElements.forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', () => {
            if (el.classList.contains('suggestion-name')) {
                el.style.textDecoration = 'underline';
            } else if (el.classList.contains('suggestion-username')) {
                el.style.opacity = '0.9';
            }
        });
        el.addEventListener('mouseleave', () => {
            if (el.classList.contains('suggestion-name')) {
                el.style.textDecoration = 'none';
            } else if (el.classList.contains('suggestion-username')) {
                el.style.opacity = '1';
            }
        });
    });

    return suggestionItem;
}

// Setup infinite scroll with debounce
function setupInfiniteScroll() {
    const scrollContainer = document.querySelector('.suggestions-scroll-container');
    let scrollDebounce;

    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollDebounce);
        scrollDebounce = setTimeout(() => {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
            if (scrollLeft + clientWidth > scrollWidth * 0.8 && !isLoading) {
                fetchUserSuggestions(true);
            }
        }, 100);
    });
}

// Global functions
window.navigateToProfile = function(url) {
    window.location.href = url;
};

window.followAccount = async function(event, button, userId) {
    event.stopPropagation();
    event.preventDefault();
    
    try {
        const currentUserId = firebase.auth().currentUser?.uid;
        if (!currentUserId) {
            alert("Please log in to follow users");
            return;
        }
        
        if (button.classList.contains('following')) {
            await db.collection('users').doc(currentUserId).collection('following').doc(userId).delete();
            await db.collection('users').doc(userId).collection('followers').doc(currentUserId).delete();
            currentFollowingIds = currentFollowingIds.filter(id => id !== userId);
            button.classList.remove('following');
            button.textContent = 'Follow';
        } else {
            await db.collection('users').doc(currentUserId).collection('following').doc(userId).set({
                followedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('users').doc(userId).collection('followers').doc(currentUserId).set({
                followedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentFollowingIds.push(userId);
            button.classList.add('following');
            button.textContent = 'Following';
        }
    } catch (error) {
        console.error("Error following/unfollowing:", error);
        alert("An error occurred. Please try again.");
    }
};

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    // Handle clicks on suggestion cards (excluding follow button)
    document.addEventListener('click', function(e) {
        const card = e.target.closest('.suggestion-item');
        const followButton = e.target.closest('.suggestion-follow');
        
        if (card && !followButton) {
            const profileUrl = `/profile/${card.querySelector('.suggestion-username').textContent.replace('@', '')}`;
            navigateToProfile(profileUrl);
        }
    });
    
    setupInfiniteScroll();
    
    firebase.auth().onAuthStateChanged(user => {
        lastVisibleUser = null;
        allUsersLoaded = false;
        isLoading = false;
        currentFollowingIds = [];
        
        if (user) {
            fetchUserSuggestions();
        } else {
            document.getElementById('suggestionsScroll').innerHTML = 
                '<p style="padding: 20px; color: #888;">Please log in to see suggestions</p>';
        }
    });
});