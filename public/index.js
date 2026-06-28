// Globals for archive
let allArtifacts = [];
let activeCategory = 'all';
let searchQuery = '';
let activeModalArtifact = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 6;


// Speech Synthesis (TTS) variables
let ttsUtterance = null;
let thaiVoice = null;
let ttsChunks = [];
let currentChunkIndex = 0;
let isTtsPlaying = false;

function loadVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    const thaiVoices = voices.filter(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
    if (thaiVoices.length > 0) {
      // Priority: Siri/Kanya/Narisa (iOS/Safari) > Google/Online/Natural (Android/Chrome) > Default Thai
      const priorityKeywords = ['siri', 'kanya', 'narisa', 'google', 'natural', 'premium', 'online'];
      let bestVoice = null;
      for (const keyword of priorityKeywords) {
        bestVoice = thaiVoices.find(v => v.name.toLowerCase().includes(keyword));
        if (bestVoice) break;
      }
      thaiVoice = bestVoice || thaiVoices[0];
      console.log('TTS Active Voice:', thaiVoice.name, thaiVoice.lang);
    }
  }
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// ----------------------------------------------------
// TTS Preprocessing: Fix Thai pronunciation for specific terms
// ----------------------------------------------------
function preprocessThaiTextForTTS(text) {
  if (!text) return '';
  
  let t = text;
  
  // Expand abbreviations
  t = t.replace(/พ\.ศ\./g, 'พุทธศักราช');
  t = t.replace(/ค\.ศ\./g, 'คริสต์ศักราช');
  t = t.replace(/ซม\./g, 'เซนติเมตร');
  t = t.replace(/กก\./g, 'กิโลกรัม');
  
  // Fix Buddhist art pronunciation
  t = t.replace(/ขัดสมาธิ/g, 'ขัดสะหมาด');
  t = t.replace(/พระเพลา/g, 'พระเพลา');
  t = t.replace(/พระนลาฎ/g, 'พระนะลาด');
  t = t.replace(/พระนลาฏ/g, 'พระนะลาด');
  t = t.replace(/นลาฎ/g, 'นะลาด');
  t = t.replace(/นลาฏ/g, 'นะลาด');
  t = t.replace(/พุทธลักษณะ/g, 'พุดทะลักษณะ');
  t = t.replace(/สังฆาฏิ/g, 'สังคาติ');
  t = t.replace(/ประภามณฑล/g, 'ประพามนทน');
  t = t.replace(/พระเนตร/g, 'พระเนด');
  t = t.replace(/พระโอษฐ์/g, 'พระโอด');
  t = t.replace(/พระกรรณ/g, 'พระกัน');
  t = t.replace(/พระขนง/g, 'พระขะหนง');

  // Clean up extra spaces
  t = t.replace(/\s+/g, ' ').trim();
  
  return t;
}

// ----------------------------------------------------
// TTS Chunking: Split into clear, natural phrases by spaces/commas.
// Prevents words from being split in half, which causes slurring.
// Uses a safe length (80 chars) for maximum clarity and compatibility.
// ----------------------------------------------------
function splitTextIntoChunks(text, maxLen = 80) {
  const parts = text.split(/[\s,;\n\t\•]+/);
  const chunks = [];
  let currentChunk = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (currentChunk && (currentChunk.length + trimmed.length + 1) > maxLen) {
      chunks.push(currentChunk);
      currentChunk = '';
    }

    if (trimmed.length > maxLen) {
      let remaining = trimmed;
      while (remaining.length > maxLen) {
        chunks.push(remaining.substring(0, maxLen));
        remaining = remaining.substring(maxLen);
      }
      if (remaining) {
        currentChunk = remaining;
      }
    } else {
      if (currentChunk) {
        currentChunk += ' ' + trimmed;
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// ----------------------------------------------------
// TTS Execution: Native SpeechSynthesis with Siri/Kanya voice priority
// ----------------------------------------------------
function speakArtifactDescription() {
  if (!activeModalArtifact) return;

  if (isTtsPlaying) {
    stopTTS();
    return;
  }

  // Ensure voices are loaded (e.g. if loaded dynamically late)
  loadVoices();

  const textToRead = `วัตถุโบราณชิ้นนี้คือ ${activeModalArtifact.title}, จัดอยู่ในหมวดหมู่ ${activeModalArtifact.categoryThai}, อายุสมัยคือ ${activeModalArtifact.age}, แหล่งที่พบคือ ${activeModalArtifact.origin}, ประวัติคือ ${activeModalArtifact.description}`;
  const preprocessed = preprocessThaiTextForTTS(textToRead);
  
  // 80 characters max to prevent slurring and avoid engine timeouts
  ttsChunks = splitTextIntoChunks(preprocessed, 80);
  currentChunkIndex = 0;
  isTtsPlaying = true;

  if (btnTts) {
    btnTts.classList.add('playing');
    btnTts.innerHTML = '<i data-lucide="square" class="icon-inline"></i> หยุดเล่นเสียง';
    if (window.lucide) lucide.createIcons();
  }

  speakNextChunk();
}

function speakNextChunk() {
  if (!isTtsPlaying) return;

  if (currentChunkIndex >= ttsChunks.length) {
    stopTTS();
    return;
  }

  if (!window.speechSynthesis) return;

  // Cancel any previous utterance to reset engine and avoid the iOS freeze bug
  window.speechSynthesis.cancel();

  const chunkText = ttsChunks[currentChunkIndex];
  ttsUtterance = new SpeechSynthesisUtterance(chunkText);
  ttsUtterance.lang = 'th-TH';
  
  if (thaiVoice) {
    ttsUtterance.voice = thaiVoice;
  }
  
  // Clear, slow reading speed for perfect word articulation
  ttsUtterance.rate = 0.85;
  ttsUtterance.pitch = 1.0;

  ttsUtterance.onend = () => {
    currentChunkIndex++;
    // Small delay between segments for natural breathing pause
    setTimeout(() => {
      speakNextChunk();
    }, 300);
  };

  ttsUtterance.onerror = (e) => {
    console.error("SpeechSynthesis error:", e);
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    currentChunkIndex++;
    setTimeout(() => {
      speakNextChunk();
    }, 300);
  };

  // Play the utterance
  window.speechSynthesis.speak(ttsUtterance);
}

function stopTTS() {
  isTtsPlaying = false;
  ttsChunks = [];
  currentChunkIndex = 0;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  if (btnTts) {
    btnTts.classList.remove('playing');
    btnTts.innerHTML = '<i data-lucide="volume-2" class="icon-inline"></i> ฟังเสียงบรรยาย';
    if (window.lucide) lucide.createIcons();
  }
}

// Elements
const archiveGrid = document.getElementById('archive-grid');
const searchInput = document.getElementById('search-input');
const categoryButtons = document.querySelectorAll('.category-btn');

const modal = document.getElementById('artifact-modal');
const modalClose = document.getElementById('modal-close');
const modalPhotoView = document.getElementById('modal-photo-view');
const modal3DView = document.getElementById('modal-3d-view');
const modalPhoto = document.getElementById('modal-photo');
const btnActivate3D = document.getElementById('modal-btn-activate-3d');
const btnBackToPhoto = document.getElementById('modal-btn-back');
const modelViewerPlaceholder = document.getElementById('model-viewer-placeholder');

const modalTitle = document.getElementById('modal-title');
const modalEngTitle = document.getElementById('modal-english-title');
const modalCategory = document.getElementById('modal-category');
const modalAge = document.getElementById('modal-age');
const modalOrigin = document.getElementById('modal-origin');
const modalDescription = document.getElementById('modal-description');
const btnTts = document.getElementById('btn-tts');

// ----------------------------------------------------
// 1. Fetch and Render Artifacts
// ----------------------------------------------------
async function fetchArtifacts() {
  const sources = [
    '/api/artifacts',
    '/assets/artifacts.json',
    'assets/artifacts.json'
  ];

  for (const source of sources) {
    try {
      const res = await fetch(source);
      if (!res.ok) continue;
      allArtifacts = await res.json();
      if (Array.isArray(allArtifacts) && allArtifacts.length > 0) {
        console.log(`Loaded ${allArtifacts.length} artifacts from ${source}`);
        break;
      }
    } catch (err) {
      console.warn(`Failed to load artifacts from ${source}`, err);
    }
  }

  if (!Array.isArray(allArtifacts) || allArtifacts.length === 0) {
    console.error('Error fetching artifacts database');
    if (archiveGrid) {
      archiveGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: #D94625; padding: 2rem;">
          <h3><i data-lucide="alert-triangle" class="icon-inline"></i> ไม่สามารถโหลดข้อมูลวัตถุโบราณได้</h3>
          <p>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต และลองรีเฟรชหน้านี้อีกครั้ง</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
    return;
  }

  renderGrid();
  renderFeaturedGallery();
}

function resolveAssetPath(assetPath) {
  if (!assetPath) return '';
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
}

function renderFeaturedGallery() {
  const featuredGrid = document.getElementById('featured-gallery-grid');
  if (!featuredGrid || !allArtifacts || allArtifacts.length === 0) return;

  // Filter for 'buddha' items first (to match "แกลเลอรี่พระ"), fallback to others if less than 6
  let featured = allArtifacts.filter(art => art.category === 'buddha');
  if (featured.length < 6) {
    const otherItems = allArtifacts.filter(art => art.category !== 'buddha');
    featured = featured.concat(otherItems.slice(0, 6 - featured.length));
  } else {
    featured = featured.slice(0, 6);
  }

  featuredGrid.innerHTML = featured.map(art => `
    <div class="gallery-item" onclick="openLightbox('${resolveAssetPath(art.image)}', '${art.title} — ${art.age}')">
      <img src="${resolveAssetPath(art.image)}" alt="${art.title}">
      <div class="gallery-overlay">
        <i data-lucide="zoom-in"></i>
        <span>ขยายภาพ ${art.title}</span>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function renderGrid() {
  if (!archiveGrid) return;

  const countIndicator = document.getElementById('archive-count-indicator');

  // Filter list
  const filtered = allArtifacts.filter(art => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery) ||
      art.englishTitle.toLowerCase().includes(searchQuery) ||
      art.description.toLowerCase().includes(searchQuery) ||
      art.categoryThai.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  if (filtered.length === 0) {
    archiveGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <p style="font-size: 1.4rem; font-family: var(--font-title); color: var(--text-muted);"><i data-lucide="search-x" class="icon-inline"></i> ไม่พบโบราณวัตถุที่ตรงตามเงื่อนไขที่ท่านค้นหา</p>
      </div>
    `;
    if (countIndicator) countIndicator.style.display = 'none';
    renderPagination(0, 1);
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Slice by current page
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const itemsToDisplay = filtered.slice(start, start + ITEMS_PER_PAGE);

  archiveGrid.innerHTML = itemsToDisplay.map((art, index) => `
    <div class="archive-card" style="animation-delay: ${index * 0.06}s;">
      <div class="archive-card-image">
        <span class="archive-card-badge">${art.categoryThai}</span>
        <img src="${resolveAssetPath(art.image)}" alt="${art.title}">
      </div>
      <div class="archive-card-info">
        <div>
          <h3>${art.title}</h3>
          <p style="margin-top: 0.5rem;">${art.description}</p>
        </div>
        <button class="btn-card-open" onclick="openArtifactModal(${art.id})"><i data-lucide="eye" class="icon-inline"></i> เปิดดูข้อมูล / ส่อง 3D</button>
      </div>
    </div>
  `).join('');

  // Update count indicator
  if (countIndicator) {
    const endItem = Math.min(start + ITEMS_PER_PAGE, filtered.length);
    countIndicator.innerHTML = `แสดงรายการที่ ${start + 1}–${endItem} จากทั้งหมด ${filtered.length} รายการ`;
    countIndicator.style.display = 'block';
  }

  renderPagination(filtered.length, totalPages);
  if (window.lucide) lucide.createIcons();
}

function renderPagination(totalItems, totalPages) {
  const pageNumbers = document.getElementById('page-numbers');
  const pagePrev = document.getElementById('page-prev');
  const pageNext = document.getElementById('page-next');
  const wrapper = document.getElementById('pagination-wrapper');

  if (!wrapper || !pageNumbers) return;

  if (totalItems <= ITEMS_PER_PAGE) {
    wrapper.style.display = 'none';
    return;
  }
  wrapper.style.display = 'flex';

  // Prev button state
  if (pagePrev) pagePrev.disabled = currentPage === 1;
  if (pageNext) pageNext.disabled = currentPage === totalPages;

  // Build page number buttons
  pageNumbers.innerHTML = '';
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button');
    btn.className = 'page-num-btn' + (p === currentPage ? ' active' : '');
    btn.textContent = p;
    btn.setAttribute('aria-label', `ไปหน้า ${p}`);
    btn.addEventListener('click', () => {
      currentPage = p;
      renderGrid();
      document.getElementById('archive-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    pageNumbers.appendChild(btn);
  }
}

// ----------------------------------------------------
// 2. Search & Category Filters
// ----------------------------------------------------
const searchClearBtn = document.getElementById('search-clear');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchClearBtn) {
      searchClearBtn.style.display = searchQuery ? 'flex' : 'none';
    }
    currentPage = 1; // reset to page 1 on new search
    renderGrid();
  });
}

if (searchClearBtn && searchInput) {
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    currentPage = 1;
    renderGrid();
    searchInput.focus();
  });
}

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.getAttribute('data-category');
    currentPage = 1; // reset to page 1 on category change
    renderGrid();
  });
});

// Wire prev/next buttons
document.addEventListener('DOMContentLoaded', () => {
  const pagePrev = document.getElementById('page-prev');
  const pageNext = document.getElementById('page-next');
  if (pagePrev) {
    pagePrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderGrid();
        document.getElementById('archive-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  if (pageNext) {
    pageNext.addEventListener('click', () => {
      const filtered = allArtifacts.filter(art => {
        const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
        const matchesSearch = art.title.toLowerCase().includes(searchQuery) ||
          art.englishTitle.toLowerCase().includes(searchQuery) ||
          art.description.toLowerCase().includes(searchQuery) ||
          art.categoryThai.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
      });
      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        renderGrid();
        document.getElementById('archive-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
});

// ----------------------------------------------------
// 3. Modal Swapping & Lazy 3D Engine Loading
// ----------------------------------------------------
window.openArtifactModal = function (id) {
  const art = allArtifacts.find(a => a.id === id);
  if (!art) return;

  activeModalArtifact = art;
  stopTTS();

  // Set text contents
  modalTitle.textContent = art.title;
  modalEngTitle.textContent = art.englishTitle;
  modalCategory.textContent = art.categoryThai;
  modalAge.textContent = art.age;
  modalOrigin.textContent = art.origin;
  modalDescription.textContent = art.description;

  // Set image view
  modalPhoto.src = resolveAssetPath(art.image);
  modalPhoto.alt = art.title;

  // Reset swap state
  modalPhotoView.style.display = 'flex';
  modal3DView.style.display = 'none';
  if (modelViewerPlaceholder) modelViewerPlaceholder.innerHTML = '';

  // Show Modal
  modal.classList.add('open');
  document.body.style.overflow = 'hidden'; // Lock background scrolling
};

function closeArtifactModal() {
  stopTTS();
  modal.classList.remove('open');
  document.body.style.overflow = 'auto'; // Restore scroll
  if (modelViewerPlaceholder) modelViewerPlaceholder.innerHTML = '';
  activeModalArtifact = null;
}

if (modalClose) {
  modalClose.addEventListener('click', closeArtifactModal);
}

// Click outside modal content to close
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeArtifactModal();
    }
  });
}

// Swap from Photo to 3D Viewer in Modal
if (btnActivate3D) {
  btnActivate3D.addEventListener('click', () => {
    if (!activeModalArtifact) return;

    modalPhotoView.style.display = 'none';
    modal3DView.style.display = 'block';

    // Create hotspots HTML
    const hotspotsHtml = (activeModalArtifact.hotspots || []).map((h, i) => `
      <button class="Hotspot" data-position="${h.pos}" data-normal="${h.norm}" slot="hotspot-${i}">
        <div class="Hotspot-annotation">${h.text}</div>
      </button>
    `).join('');

    // Inject model-viewer dynamically to save DOM memory
    modelViewerPlaceholder.innerHTML = `
      <model-viewer 
        id="modal-viewer"
        src="${resolveAssetPath(activeModalArtifact.model)}" 
        camera-controls 
        tone-mapping="neutral" 
        shadow-intensity="1"
        shadow-softness="0.5"
        auto-rotate
        alt="${activeModalArtifact.title}"
        style="width: 100%; height: 100%;">
        ${hotspotsHtml}
      </model-viewer>
    `;

    // Bind hotspot triggers inside dynamically injected viewer
    setTimeout(() => {
      const viewer = document.getElementById('modal-viewer');
      if (viewer) {
        const spots = viewer.querySelectorAll('.Hotspot');
        spots.forEach(spot => {
          spot.addEventListener('click', () => {
            viewer.querySelectorAll('.Hotspot-annotation').forEach(ann => {
              if (ann !== spot.querySelector('.Hotspot-annotation')) {
                ann.classList.remove('active');
              }
            });
            spot.querySelector('.Hotspot-annotation').classList.toggle('active');
          });
        });

        viewer.addEventListener('click', (e) => {
          if (!e.target.classList.contains('Hotspot')) {
            viewer.querySelectorAll('.Hotspot-annotation').forEach(ann => {
              ann.classList.remove('active');
            });
          }
        });
      }
    }, 100);
  });
}

if (btnBackToPhoto) {
  btnBackToPhoto.addEventListener('click', () => {
    modal3DView.style.display = 'none';
    modalPhotoView.style.display = 'flex';
    if (modelViewerPlaceholder) modelViewerPlaceholder.innerHTML = '';
  });
}

if (btnTts) {
  btnTts.addEventListener('click', speakArtifactDescription);
}



// Navigation active highlighting on scroll
const scrollSections = document.querySelectorAll('section');
const headerNavItems = document.querySelectorAll('.nav-item');

function updateActiveNavItem() {
  let current = '';
  const scrollY = window.scrollY || window.pageYOffset;
  
  scrollSections.forEach(section => {
    const sectionTop = section.offsetTop;
    if (scrollY >= (sectionTop - 250)) {
      current = section.getAttribute('id');
    }
  });

  headerNavItems.forEach(item => {
    item.classList.remove('active');
    const link = item.querySelector('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href === `#${current}` || 
          (current === 'archive-section' && href === '#archive-section') ||
          (current === 'gallery-section' && href === '#archive-section')) {
        item.classList.add('active');
      }
    }
  });
}

window.addEventListener('scroll', updateActiveNavItem);

// Mobile menu toggle
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    navToggle.innerHTML = navMenu.classList.contains('open') ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
    if (window.lucide) lucide.createIcons();
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.innerHTML = '<i data-lucide="menu"></i>';
      if (window.lucide) lucide.createIcons();
    });
  });
}


// ----------------------------------------------------
// Lightbox Controllers for Sacred Gallery
// ----------------------------------------------------
window.openLightbox = function (imgSrc, captionText) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');

  if (lightbox && lightboxImg) {
    lightboxImg.src = imgSrc;
    if (lightboxCaption) {
      lightboxCaption.textContent = captionText || '';
    }
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden'; // Lock scrolling
    if (window.lucide) lucide.createIcons();
  }
};

window.closeLightbox = function () {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('open');
    const artModal = document.getElementById('artifact-modal');
    if (!artModal || !artModal.classList.contains('open')) {
      document.body.style.overflow = 'auto'; // Restore scrolling
    }
  }
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});

// ----------------------------------------------------
// 7. Initial startup
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Setup
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('dark-theme');
  
  if (savedTheme === 'enabled') {
    document.body.classList.add('dark-theme');
  } else if (savedTheme === 'disabled') {
    document.body.classList.remove('dark-theme');
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-theme');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('dark-theme', isDark ? 'enabled' : 'disabled');
      if (window.lucide) lucide.createIcons();
    });
  }

  fetchArtifacts();
  updateActiveNavItem();
  if (window.lucide) {
    lucide.createIcons();
  }
});
