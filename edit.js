  // [All your existing JavaScript remains unchanged until the end]
        
        // Add these new functions for edit functionality
        let avatarFile = null;
        let coverFile = null;
        let originalUsername = '';
        
        // Initialize edit modal
        function initEditModal() {
            const editButton = document.getElementById('edit-button');
            const closeModal = document.getElementById('close-modal');
            const cancelEdit = document.getElementById('cancel-edit');
            const editModal = document.getElementById('edit-modal');
            const editForm = document.getElementById('edit-profile-form');
            const avatarUpload = document.getElementById('edit-avatar-upload');
            const coverUpload = document.getElementById('edit-cover-upload');
            const usernameInput = document.getElementById('edit-username');
            
            editButton.addEventListener('click', openEditModal);
            closeModal.addEventListener('click', closeEditModal);
            cancelEdit.addEventListener('click', closeEditModal);
            editForm.addEventListener('submit', saveProfileChanges);
            
            avatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    avatarFile = file;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        document.getElementById('avatar-preview').src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            coverUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    coverFile = file;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        document.getElementById('cover-preview').src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Real-time username availability check
            usernameInput.addEventListener('input', debounce(checkUsernameAvailability, 500));
        }
        
        function debounce(func, timeout = 300) {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => { func.apply(this, args); }, timeout);
            };
        }
        
        async function checkUsernameAvailability() {
            const usernameInput = document.getElementById('edit-username');
            const username = usernameInput.value.trim().toLowerCase();
            const availabilityMsg = document.getElementById('username-availability');
            
            if (username === originalUsername) {
                availabilityMsg.style.display = 'none';
                return;
            }
            
            if (username.length < 3) {
                availabilityMsg.style.display = 'block';
                availabilityMsg.textContent = 'Username must be at least 3 characters';
                availabilityMsg.className = 'username-availability taken';
                return;
            }
            
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .neq('id', profileId);
            
            if (error) {
                console.error('Error checking username:', error);
                return;
            }
            
            if (data && data.length > 0) {
                availabilityMsg.style.display = 'block';
                availabilityMsg.textContent = 'Username is already taken';
                availabilityMsg.className = 'username-availability taken';
            } else {
                availabilityMsg.style.display = 'block';
                availabilityMsg.textContent = 'Username is available';
                availabilityMsg.className = 'username-availability available';
            }
        }
        
        async function openEditModal() {
            const editModal = document.getElementById('edit-modal');
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();
            
            if (error) {
                console.error('Error loading profile for edit:', error);
                showError('Failed to load profile for editing');
                return;
            }
            
            // Populate form fields
            document.getElementById('edit-full-name').value = profile.full_name || '';
            document.getElementById('edit-username').value = profile.username || '';
            document.getElementById('edit-bio').value = profile.bio || '';
            document.getElementById('edit-website').value = profile.website || '';
            document.getElementById('edit-category').value = profile.category || '';
            document.getElementById('edit-experience').value = profile.experience || '';
            document.getElementById('edit-skills').value = profile.skills || '';
            
            // Set preview images
            const avatarPreview = document.getElementById('avatar-preview');
            if (profile.avatar_url) {
                avatarPreview.src = profile.avatar_url;
            } else {
                const initials = profile.full_name ? 
                    profile.full_name.split(' ').map(n => n[0]).join('') : 'U';
                avatarPreview.src = `https://ui-avatars.com/api/?name=${initials}&background=0056b3&color=fff&size=80`;
            }
            
            const coverPreview = document.getElementById('cover-preview');
            if (profile.cover_photo_url) {
                coverPreview.src = profile.cover_photo_url;
            } else {
                coverPreview.style.backgroundColor = '#0056b3';
            }
            
            // Store original username for comparison
            originalUsername = profile.username || '';
            
            // Reset file inputs
            avatarFile = null;
            coverFile = null;
            document.getElementById('edit-avatar-upload').value = '';
            document.getElementById('edit-cover-upload').value = '';
            document.getElementById('username-availability').style.display = 'none';
            
            editModal.style.display = 'flex';
        }
        
        function closeEditModal() {
            document.getElementById('edit-modal').style.display = 'none';
        }
        
        async function saveProfileChanges(e) {
            e.preventDefault();
            
            const saveButton = e.target.querySelector('button[type="submit"]');
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            
            const fullName = document.getElementById('edit-full-name').value.trim();
            const username = document.getElementById('edit-username').value.trim().toLowerCase();
            const bio = document.getElementById('edit-bio').value.trim();
            const website = document.getElementById('edit-website').value.trim();
            const category = document.getElementById('edit-category').value;
            const experience = document.getElementById('edit-experience').value.trim();
            const skills = document.getElementById('edit-skills').value.trim();
            
            // Check username availability one more time
            if (username !== originalUsername) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', username)
                    .neq('id', profileId);
                
                if (data && data.length > 0) {
                    showError('Username is already taken. Please choose another.');
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Changes';
                    return;
                }
            }
            
            try {
                // Upload avatar if changed
                let avatarUrl = null;
                if (avatarFile) {
                    const avatarExt = avatarFile.name.split('.').pop();
                    const avatarPath = `avatars/${profileId}.${avatarExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(avatarPath, avatarFile, {
                            cacheControl: '3600',
                            upsert: true
                        });
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(avatarPath);
                    
                    avatarUrl = urlData.publicUrl;
                }
                
                // Upload cover if changed
                let coverUrl = null;
                if (coverFile) {
                    const coverExt = coverFile.name.split('.').pop();
                    const coverPath = `covers/${profileId}.${coverExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('covers')
                        .upload(coverPath, coverFile, {
                            cacheControl: '3600',
                            upsert: true
                        });
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: urlData } = supabase.storage
                        .from('covers')
                        .getPublicUrl(coverPath);
                    
                    coverUrl = urlData.publicUrl;
                }
                
                // Update profile data
                const updates = {
                    full_name: fullName,
                    username: username,
                    username_slug: username.toLowerCase().replace(/\s+/g, '-'),
                    bio: bio,
                    website: website,
                    category: category,
                    experience: experience,
                    skills: skills,
                    updated_at: new Date().toISOString()
                };
                
                if (avatarUrl) updates.avatar_url = avatarUrl;
                if (coverUrl) updates.cover_photo_url = coverUrl;
                
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', profileId);
                
                if (updateError) throw updateError;
                
                // Close modal and refresh profile
                closeEditModal();
                loadProfile();
                
            } catch (error) {
                console.error('Error saving profile:', error);
                showError('Failed to save profile changes. Please try again.');
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Changes';
            }
        }
        
        // Initialize the page
        document.addEventListener('DOMContentLoaded', () => {
            loadProfile();
            initEditModal();
        });
