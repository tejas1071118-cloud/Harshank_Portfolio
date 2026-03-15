// ===================== DOM READY =====================
document.addEventListener('DOMContentLoaded', () => {
    initDropZone();
    initUploadForm();
    initLibrary();
    initLogout();
});

let selectedFiles = [];

// ===================== DROP ZONE =====================
function initDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    // Click to open file picker
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // File input change
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';  // reset so same file can be selected again
    });
}

function handleFiles(fileList) {
    const newFiles = Array.from(fileList);
    selectedFiles.push(...newFiles);
    renderSelectedFiles();
    updateUploadBtnState();
}

function renderSelectedFiles() {
    const container = document.getElementById('selected-files');
    if (!container) return;

    container.innerHTML = selectedFiles.map((file, index) => {
        const isVideo = file.type.startsWith('video/');
        const url = URL.createObjectURL(file);
        return `
            <div class="file-preview" data-index="${index}">
                ${isVideo
                    ? `<video src="${url}" muted></video>`
                    : `<img src="${url}" alt="${file.name}">`
                }
                <button class="remove-file" onclick="removeFile(${index})">&times;</button>
                <div class="file-name">${file.name}</div>
            </div>
        `;
    }).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderSelectedFiles();
    updateUploadBtnState();
}

function updateUploadBtnState() {
    const btn = document.getElementById('btn-upload');
    if (btn) btn.disabled = selectedFiles.length === 0;
}

// ===================== UPLOAD FORM =====================
function initUploadForm() {
    const form = document.getElementById('upload-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return;

        const title = document.getElementById('upload-title').value.trim();
        const category = document.getElementById('upload-category').value;

        const formData = new FormData();
        formData.append('title', title || 'Untitled');
        formData.append('category', category);
        selectedFiles.forEach(file => formData.append('files', file));

        const btn = document.getElementById('btn-upload');
        const progress = document.getElementById('progress-container');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        btn.classList.add('loading');
        btn.disabled = true;
        progress.classList.add('show');
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';

        try {
            // Use XMLHttpRequest for progress tracking
            const result = await uploadWithProgress(formData, (percent) => {
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `${Math.round(percent)}%`;
            });

            if (result.success) {
                showToast(`✅ Successfully uploaded ${result.uploaded} file(s)!`, 'success');
                selectedFiles = [];
                renderSelectedFiles();
                document.getElementById('upload-title').value = '';
                loadLibrary();
                updateStats();
            } else {
                showToast(`❌ Upload failed: ${result.error}`, 'error');
            }
        } catch (err) {
            showToast(`❌ Upload error: ${err.message}`, 'error');
        } finally {
            btn.classList.remove('loading');
            updateUploadBtnState();
            setTimeout(() => {
                progress.classList.remove('show');
            }, 2000);
        }
    });
}

function uploadWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                onProgress((e.loaded / e.total) * 100);
            }
        });

        xhr.addEventListener('load', () => {
            try {
                resolve(JSON.parse(xhr.responseText));
            } catch {
                reject(new Error('Invalid response'));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '';
        xhr.open('POST', API_URL + '/api/upload');
        xhr.withCredentials = true;
        xhr.send(formData);
    });
}

// ===================== TOAST =====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ===================== LIBRARY =====================
function initLibrary() {
    loadLibrary();
    updateStats();
    initLibraryFilters();
}

let currentFilter = 'all';

function initLibraryFilters() {
    document.querySelectorAll('.lib-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lib-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.cat;
            loadLibrary();
        });
    });
}

async function loadLibrary() {
    const grid = document.getElementById('library-grid');
    if (!grid) return;

    try {
        const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '';
        const url = API_URL + (currentFilter === 'all' ? '/api/media' : `/api/media?category=${currentFilter}`);
        const res = await fetch(url);
        const media = await res.json();

        if (!media || media.length === 0) {
            grid.innerHTML = '<p class="library-empty">No media uploaded yet. Use the upload form above to get started!</p>';
            return;
        }

        grid.innerHTML = media.map(item => {
            const dateStr = new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const sizeStr = formatSize(item.size);

            return `
                <div class="media-card" data-id="${item.id}">
                    <div class="media-thumb">
                        ${item.type === 'video'
                            ? `<video src="${item.path}" muted preload="metadata"></video>`
                            : `<img src="${item.path}" alt="${escapeHtml(item.title)}" loading="lazy">`
                        }
                        <span class="media-type-badge ${item.type}">${item.type}</span>
                    </div>
                    <div class="media-info">
                        <div class="media-title">${escapeHtml(item.title)}</div>
                        <div class="media-meta">
                            <span>${formatCategory(item.category)} · ${sizeStr}</span>
                            <button class="btn-delete" onclick="deleteMedia('${item.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Hover play for video thumbnails
        grid.querySelectorAll('.media-card video').forEach(video => {
            const card = video.closest('.media-card');
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
        });

    } catch (err) {
        console.error('Library load error:', err);
    }
}

async function deleteMedia(id) {
    if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;

    try {
        const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '';
        const res = await fetch(API_URL + `/api/media/${id}`, { 
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await res.json();
        if (result.success) {
            showToast('🗑️ File deleted successfully.', 'success');
            loadLibrary();
            updateStats();
        } else {
            showToast(`❌ Delete failed: ${result.error}`, 'error');
        }
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'error');
    }
}

async function updateStats() {
    try {
        const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '';
        const res = await fetch(API_URL + '/api/media');
        const media = await res.json();
        document.getElementById('stat-total').textContent = media.length;
        document.getElementById('stat-images').textContent = media.filter(m => m.type === 'image').length;
        document.getElementById('stat-videos').textContent = media.filter(m => m.type === 'video').length;
    } catch { /* ignore */ }
}

// ===================== UTILITY =====================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatCategory(cat) {
    return (cat || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ===================== LOGOUT =====================
function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', async () => {
        try {
            const res = await fetch(API_URL + '/api/logout', { 
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                window.location.href = '/login.html';
            }
        } catch {
            alert('Logout failed');
        }
    });
}
