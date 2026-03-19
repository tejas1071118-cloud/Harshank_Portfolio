// ===================== DOM READY =====================
document.addEventListener('DOMContentLoaded', () => {
    initRevealAnimations();
    initNavbar();
    initPortfolio();
    initLightbox();
    initMobileMenu();
    initCustomCursor();
    initContactForm();
});

// ===================== CUSTOM CURSOR =====================
function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const glow = document.getElementById('custom-cursor-glow');
    
    if (!cursor || !glow) return;

    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    });

    // Expand on hover
    const links = document.querySelectorAll('a, button, .portfolio-item, .contact-card');
    links.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('expand');
            glow.classList.add('expand');
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('expand');
            glow.classList.remove('expand');
        });
    });
}

// ===================== SCROLL REVEAL =====================
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ===================== NAVBAR =====================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const current = window.scrollY;
        if (current > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        lastScroll = current;
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-links a, .nav-cta').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

// ===================== MOBILE MENU =====================
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navCta = document.querySelector('.nav-cta');
    
    if (!btn) return;

    btn.addEventListener('click', () => {
        const isOpen = navLinks.style.display === 'flex';
        navLinks.style.display = isOpen ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'rgba(10,10,20,0.95)';
        navLinks.style.padding = isOpen ? '0' : '20px';
        navLinks.style.gap = '16px';
        navLinks.style.borderBottom = '1px solid rgba(255,255,255,0.08)';

        if (navCta) {
            navCta.style.display = isOpen ? 'none' : 'inline-block';
            navCta.style.position = 'absolute';
            navCta.style.top = `calc(100% + ${navLinks.offsetHeight + 20}px)`;
        }
    });
}

// ===================== PORTFOLIO =====================
function initPortfolio() {
    loadAllSections();
}

async function loadAllSections() {
    try {
        const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '';
        const res = await fetch(API_URL + '/api/media');
        const media = await res.json();

        const sections = {
            'photography': { grid: document.getElementById('photography-grid'), items: [] },
            'video-editing': { grid: document.getElementById('video-editing-grid'), items: [] },
            'fine-arts': { grid: document.getElementById('fine-arts-grid'), items: [] }
        };

        if (!media || media.length === 0) return; // leave placeholders

        // Special Categories Interceptor (Direct DOM updates)
        const heroVisual = media.find(item => item.category === 'hero-visual');
        if (heroVisual) {
            const frame = document.querySelector('.hero-image-frame');
            if (frame) {
                frame.classList.remove('no-img'); // Remove placeholder Slate icon fallback
                if (heroVisual.type === 'video') {
                    frame.innerHTML = `<video src="${heroVisual.path}" autoplay muted loop style="width: 100%; height: 100%; object-fit: cover;"></video>`;
                } else {
                    frame.innerHTML = `<img src="${heroVisual.path}" id="hero-img" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            }
        }

        const featuredProject = media.find(item => item.category === 'featured-project');
        if (featuredProject && document.getElementById('watch-project-btn')) {
            const watchBtn = document.getElementById('watch-project-btn');
            watchBtn.onclick = (e) => {
                e.preventDefault();
                openLightbox(featuredProject.path, featuredProject.type);
            };
            
            // Render video element or image poster
            const frame = document.querySelector('#featured-projects .video-frame');
            if (frame) {
                if (featuredProject.type === 'video') {
                    frame.innerHTML = `
                        <video style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;">
                            <source src="${featuredProject.path}" type="video/mp4">
                        </video>
                        <div class="video-placeholder" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15);">
                            <span class="play-icon">▶</span>
                        </div>
                    `;
                } else {
                    frame.innerHTML = `<img src="${featuredProject.path}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;">`;
                }
                frame.onclick = () => openLightbox(featuredProject.path, featuredProject.type);
            }
            
            const textSection = document.querySelector('#featured-projects .featured-text');
            if (textSection) {
                textSection.querySelector('h2').textContent = featuredProject.title;
            }
        }

        // Distribute items to grids
        media.forEach(item => {
            if (item.category === 'photography') {
                sections['photography'].items.push(item);
            } else if (item.category === 'food-reels' || item.category === 'youtube' || item.category === 'video-editing') {
                sections['video-editing'].items.push(item);
            } else if (item.category !== 'hero-visual' && item.category !== 'featured-project') {
                // Treats 'other-work' and 'fine-arts' as fine arts
                sections['fine-arts'].items.push(item);
            }
        });

        // Populate grids
        for (const key in sections) {
            const section = sections[key];
            if (section.items.length > 0 && section.grid) {
                section.grid.innerHTML = section.items.map(item => generateMediaHTML(item)).join('');
            }
        }

        // Attach interactions to new items
        document.querySelectorAll('.portfolio-grid').forEach(grid => {
            // Hover play for videos
            grid.querySelectorAll('.portfolio-item video').forEach(video => {
                const item = video.closest('.portfolio-item');
                item.addEventListener('mouseenter', () => video.play());
                item.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
            });

            // Lightbox trigger
            grid.querySelectorAll('.portfolio-item').forEach(item => {
                item.addEventListener('click', () => {
                    const src = item.dataset.src;
                    const type = item.dataset.type;
                    openLightbox(src, type);
                });
            });
        });

    } catch (err) {
        console.error('Failed to load media:', err);
    }
}

function generateMediaHTML(item) {
    if (item.type === 'youtube') {
        const id = item.path; // assuming path contains the video ID
        const thumbUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        return `
            <div class="portfolio-item reveal visible" data-src="https://www.youtube.com/embed/${id}?autoplay=1" data-type="youtube">
                <img src="${thumbUrl}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${id}/hqdefault.jpg';">
                <span class="video-badge" style="background: #FF0000;">YouTube</span>
                <div class="play-icon-center"></div>
                <div class="item-overlay">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <div class="item-category">${formatCategory(item.category)}</div>
                </div>
            </div>
        `;
    } else if (item.type === 'video') {
        return `
            <div class="portfolio-item reveal visible" data-src="${item.path}" data-type="video">
                <video src="${item.path}" muted loop preload="metadata"></video>
                <span class="video-badge">Video</span>
                <div class="item-overlay">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <div class="item-category">${formatCategory(item.category)}</div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="portfolio-item reveal visible" data-src="${item.path}" data-type="image">
                <img src="${item.path}" alt="${escapeHtml(item.title)}" loading="lazy">
                <div class="item-overlay">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <div class="item-category">${formatCategory(item.category)}</div>
                </div>
            </div>
        `;
    }
}

// ===================== LIGHTBOX =====================
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightbox-close');

    if (!lightbox || !closeBtn) return;

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });
}

function openLightbox(src, type) {
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightbox-content');
    if (!lightbox || !content) return;

    if (type === 'youtube') {
        content.innerHTML = `<iframe src="${src}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:90vw;height:85vh;aspect-ratio:16/9;border-radius:16px;border:none;"></iframe>`;
    } else if (type === 'video') {
        content.innerHTML = `<video src="${src}" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:16px;"></video>`;
    } else {
        content.innerHTML = `<img src="${src}" alt="Portfolio image" style="max-width:90vw;max-height:85vh;border-radius:16px;">`;
    }

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightbox-content');
    if (!lightbox) return;

    lightbox.classList.remove('active');
    document.body.style.overflow = '';

    setTimeout(() => {
        if (content) content.innerHTML = '';
    }, 300);
}

// ===================== UTILITY =====================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatCategory(cat) {
    return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ===================== CONTACT FORM =====================
function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const status = document.getElementById('form-status');
        const btn = document.getElementById('submit-btn');
        
        status.textContent = 'Sending message...';
        status.className = 'form-status';
        btn.disabled = true;

        const formData = new FormData(form);

        try {
            // Check if user set a real access key
            if (formData.get('access_key') === 'YOUR_ACCESS_KEY_HERE') {
                setTimeout(() => {
                    status.textContent = 'This is a demo form! Replace YOUR_ACCESS_KEY_HERE with a real Web3Forms key to receive emails.';
                    status.className = 'form-status error';
                    btn.disabled = false;
                    form.reset();
                }, 1500);
                return;
            }

            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                status.textContent = 'Message sent successfully! I will get back to you soon.';
                status.className = 'form-status success';
                form.reset();
            } else {
                status.textContent = data.message || 'Something went wrong. Please try again.';
                status.className = 'form-status error';
            }
        } catch (error) {
            status.textContent = 'Network error. Please try again later.';
            status.className = 'form-status error';
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                if(status.className.includes('success')) {
                    status.textContent = '';
                    status.className = 'form-status';
                }
            }, 5000);
        }
    });
}
