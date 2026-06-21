// Globals for archive
let allArtifacts = [];
let activeCategory = 'all';
let searchQuery = '';
let activeModalArtifact = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 6;

// Audio Synthesizer variables
let audioCtx = null;
let droneOsc1 = null;
let droneOsc2 = null;
let droneGain = null;
let bellInterval = null;
let isAudioPlaying = false;

// Speech Synthesis (TTS) variables
let ttsUtterance = null;

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
  try {
    const res = await fetch('/api/artifacts');
    allArtifacts = await res.json();
    renderGrid();
    renderFeaturedGallery();
  } catch (err) {
    console.error("Error fetching artifacts database", err);
    if (archiveGrid) {
      archiveGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: #D94625; padding: 2rem;">
          <h3><i data-lucide="alert-triangle" class="icon-inline"></i> ไม่สามารถเชื่อมต่อฐานข้อมูลได้</h3>
          <p>กรุณาตรวจสอบว่า Node.js รันทำงานอยู่ตามปกติ</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }
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
    <div class="gallery-item" onclick="openLightbox('${art.image}', '${art.title} — ${art.age}')">
      <img src="${art.image}" alt="${art.title}">
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

  archiveGrid.innerHTML = itemsToDisplay.map(art => `
    <div class="archive-card">
      <div class="archive-card-image">
        <span class="archive-card-badge">${art.categoryThai}</span>
        <img src="${art.image}" alt="${art.title}">
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
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentPage = 1; // reset to page 1 on new search
    renderGrid();
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
  modalPhoto.src = art.image;
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
        src="${activeModalArtifact.model}" 
        ar 
        ar-modes="webxr scene-viewer quick-look" 
        camera-controls 
        tone-mapping="neutral" 
        shadow-intensity="1"
        shadow-softness="0.5"
        auto-rotate
        alt="${activeModalArtifact.title}"
        style="width: 100%; height: 100%;">
        ${hotspotsHtml}
        <button slot="ar-button" class="ar-button">เปิดกล้องส่องพระในบ้านคุณ (AR)</button>
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

// ----------------------------------------------------
// 4. Text-To-Speech (TTS) for Elderly Accessibility
// ----------------------------------------------------
function speakArtifactDescription() {
  if (!activeModalArtifact) return;

  if (window.speechSynthesis.speaking) {
    stopTTS();
    return;
  }

  const textToRead = `${activeModalArtifact.title}. หมวดหมู่ ${activeModalArtifact.categoryThai}. อายุสมัย ${activeModalArtifact.age}. แหล่งค้นพบในพื้นที่ ${activeModalArtifact.origin}. ประวัติความเป็นมาโดยย่อ ${activeModalArtifact.description}`;

  ttsUtterance = new SpeechSynthesisUtterance(textToRead);
  ttsUtterance.lang = 'th-TH';

  // Set slightly slower rate for elderly understanding
  ttsUtterance.rate = 0.85;
  ttsUtterance.pitch = 1.0;

  ttsUtterance.onstart = () => {
    btnTts.classList.add('playing');
    btnTts.innerHTML = '<i data-lucide="square" class="icon-inline"></i> หยุดเล่นเสียงอ่านประวัติ';
    if (window.lucide) lucide.createIcons();
  };

  ttsUtterance.onend = () => {
    btnTts.classList.remove('playing');
    btnTts.innerHTML = '<i data-lucide="volume-2" class="icon-inline"></i> กดเพื่อฟังเสียงอ่านประวัติให้ฟัง';
    if (window.lucide) lucide.createIcons();
  };

  ttsUtterance.onerror = () => {
    btnTts.classList.remove('playing');
    btnTts.innerHTML = '<i data-lucide="volume-2" class="icon-inline"></i> กดเพื่อฟังเสียงอ่านประวัติให้ฟัง';
    if (window.lucide) lucide.createIcons();
  };

  // Speak
  window.speechSynthesis.speak(ttsUtterance);
}

function stopTTS() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  if (btnTts) {
    btnTts.classList.remove('playing');
    btnTts.innerHTML = '<i data-lucide="volume-2" class="icon-inline"></i> กดเพื่อฟังเสียงอ่านประวัติให้ฟัง';
    if (window.lucide) lucide.createIcons();
  }
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
// 6. Ambient Temple Synthesizer (Web Audio API)
// ----------------------------------------------------
const audioBtn = document.getElementById('audio-btn');
const audioText = document.getElementById('audio-text');

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Drone Gain
  droneGain = audioCtx.createGain();
  droneGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
  droneGain.connect(audioCtx.destination);

  // Osc 1
  droneOsc1 = audioCtx.createOscillator();
  droneOsc1.type = 'triangle';
  droneOsc1.frequency.setValueAtTime(65.41, audioCtx.currentTime);

  // Osc 2
  droneOsc2 = audioCtx.createOscillator();
  droneOsc2.type = 'sine';
  droneOsc2.frequency.setValueAtTime(97.99, audioCtx.currentTime);

  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(150, audioCtx.currentTime);

  droneOsc1.connect(lowpass);
  droneOsc2.connect(lowpass);
  lowpass.connect(droneGain);

  droneOsc1.start();
  droneOsc2.start();

  playBellStrike();

  bellInterval = setInterval(() => {
    if (isAudioPlaying) {
      playBellStrike();
    }
  }, 12000);
}

function playBellStrike() {
  if (!audioCtx || audioCtx.state === 'suspended') return;
  const now = audioCtx.currentTime;
  const frequencies = [440, 554.37, 659.25, 880];

  frequencies.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = index === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 15, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(index === 0 ? 0.08 : 0.03, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.5 + index);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 8.5);
  });
}

function toggleAudio() {
  if (!audioCtx) {
    initAudio();
  }

  if (isAudioPlaying) {
    droneGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 1.5);
    audioBtn.classList.remove('playing');
    audioBtn.innerHTML = '<i data-lucide="volume-2"></i>';
    if (window.lucide) lucide.createIcons();
    if (audioText) audioText.innerHTML = 'เปิดเสียงระฆังบรรเลง';
    isAudioPlaying = false;
  } else {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    droneGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 2.0);
    audioBtn.classList.add('playing');
    audioBtn.innerHTML = '<i data-lucide="volume-x"></i>';
    if (window.lucide) lucide.createIcons();
    if (audioText) audioText.innerHTML = 'ปิดเสียงระฆัง';
    isAudioPlaying = true;
  }
}

if (audioBtn) {
  audioBtn.addEventListener('click', toggleAudio);
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
