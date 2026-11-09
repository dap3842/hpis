// Master Application Logic — Clinical Light Architecture (DESIGN.md)
// Full Mobile, Tablet & Desktop Ergonomic Adaptation
document.addEventListener('DOMContentLoaded', () => {
  const topics = window.HP_DATABASE || [];
  const heroes = window.HEROES_INDEX || [];
  const quotes = window.QUOTES_BANK || [];
  const clustersMeta = window.CLUSTERS_META || [];

  let isSelfTestMode = false;
  let activeTab = 'map';
  let activeTopic = null;

  // Pagination state for topics list
  let currentPage = 1;
  let itemsPerPage = 50;

  // Haptic feedback helper for mobile devices
  function haptic(ms = 15) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // -------------------------------------------------------------
  // SYNCHRONIZED TAB NAVIGATION (DESKTOP + MOBILE BOTTOM NAV)
  // -------------------------------------------------------------
  const allTabButtons = document.querySelectorAll('.tab-btn, .mobile-tab-btn');
  const viewSections = document.querySelectorAll('.view-section');

  function switchTab(target) {
    activeTab = target;
    haptic(10);

    allTabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === target);
    });

    viewSections.forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === `view-${target}`) {
        sec.classList.add('active');
      }
    });

    // Close open drawer when navigating on mobile
    if (window.innerWidth <= 768 && activeTopic) {
      closeDrawer();
    }

    if (target === 'map') {
      resizeCanvas();
      requestAnimationFrame(renderGalaxy);
    } else if (target === 'list') {
      renderList();
    } else if (target === 'heroes') {
      renderHeroes();
    } else if (target === 'quotes') {
      renderQuotes();
    }
  }

  allTabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Self Test Mode Toggle
  const btnSelfTest = document.getElementById('btn-self-test');
  if (btnSelfTest) {
    btnSelfTest.addEventListener('click', () => {
      isSelfTestMode = !isSelfTestMode;
      haptic(20);
      btnSelfTest.classList.toggle('active', isSelfTestMode);
      
      const btnTextDesk = btnSelfTest.querySelector('.btn-text-desktop');
      const btnTextMob = btnSelfTest.querySelector('.btn-text-mobile');
      if (btnTextDesk) btnTextDesk.textContent = isSelfTestMode ? 'Экзамен (скрыто)' : 'Самопроверка';
      if (btnTextMob) btnTextMob.textContent = isSelfTestMode ? 'Экзамен' : 'Тест';
      if (activeTopic) renderDrawer(activeTopic);
    });
  }

  // -------------------------------------------------------------
  // GALAXY MAP CANVAS ENGINE — TOUCH, TOUCHPAD & MOUSE
  // -------------------------------------------------------------
  const canvas = document.getElementById('galaxy-canvas');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('map-tooltip');

  let width = canvas.clientWidth || window.innerWidth;
  let height = canvas.clientHeight || window.innerHeight;
  let dpr = window.devicePixelRatio || 1;

  // Camera state
  let scale = 0.38;
  let offsetX = width / 2;
  let offsetY = height / 2;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let hoveredTopic = null;

  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', () => {
    resizeCanvas();
    renderPaginationResponsive();
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resizeCanvas();
      renderPaginationResponsive();
    }, 200);
  });
  resizeCanvas();

  function screenToWorld(sx, sy) {
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * scale + offsetX,
      y: wy * scale + offsetY
    };
  }

  function zoomAt(screenX, screenY, zoomFactor) {
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.15), 4.5);
    offsetX = screenX - (screenX - offsetX) * (newScale / scale);
    offsetY = screenY - (screenY - offsetY) * (newScale / scale);
    scale = newScale;
    requestAnimationFrame(renderGalaxy);
  }

  let animFrameId = null;
  function flyTo(targetX, targetY, targetScale = 1.0, duration = 500) {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    
    const startScale = scale;
    const startOffsetX = offsetX;
    const startOffsetY = offsetY;
    
    const endOffsetX = width / 2 - targetX * targetScale;
    const endOffsetY = height / 2 - targetY * targetScale;
    
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      scale = startScale + (targetScale - startScale) * ease;
      offsetX = startOffsetX + (endOffsetX - startOffsetX) * ease;
      offsetY = startOffsetY + (endOffsetY - startOffsetY) * ease;
      
      renderGalaxy();
      
      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        animFrameId = null;
      }
    }
    animFrameId = requestAnimationFrame(animate);
  }

  // Populate map cluster jump dropdown
  const mapClusterJump = document.getElementById('map-cluster-jump');
  if (mapClusterJump) {
    clustersMeta.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.name} (${c.count})`;
      mapClusterJump.appendChild(opt);
    });

    mapClusterJump.addEventListener('change', () => {
      const val = mapClusterJump.value;
      if (val === 'all') {
        flyTo(0, 0, 0.38, 600);
      } else {
        const targetC = clustersMeta.find(c => c.name === val);
        if (targetC) flyTo(targetC.x, targetC.y, 1.25, 600);
      }
    });
  }

  function renderGalaxy() {
    if (activeTab !== 'map') return;

    // Crisp frosted paper background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Subtle Island Nebulas (No text in the air)
    clustersMeta.forEach(c => {
      const s = worldToScreen(c.x, c.y);
      const rad = Math.max(120 * scale, 25);
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad * 1.5);
      
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.035)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.01)');
      grad.addColorStop(1, 'rgba(250, 250, 250, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad * 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Draw Intra-Cluster Constellation Lines
    ctx.lineWidth = 1;
    topics.forEach(t => {
      if (!t.neighbors || t.neighbors.length === 0) return;
      const p1 = worldToScreen(t.x, t.y);

      t.neighbors.forEach(nId => {
        const neighbor = topics[nId - 1];
        if (!neighbor) return;
        const p2 = worldToScreen(neighbor.x, neighbor.y);

        const isHighlighted = (hoveredTopic && (hoveredTopic.id === t.id || hoveredTopic.id === neighbor.id));
        if (isHighlighted) {
          ctx.strokeStyle = '#0a0a0a';
          ctx.lineWidth = 1.8;
        } else if (scale > 0.6) {
          ctx.strokeStyle = '#e5e5e5';
          ctx.lineWidth = 0.8;
        } else {
          return;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    });

    // 3. Draw Stars (Topics)
    topics.forEach(t => {
      const p = worldToScreen(t.x, t.y);

      if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) return;

      const isHovered = hoveredTopic && hoveredTopic.id === t.id;
      const isSelected = activeTopic && activeTopic.id === t.id;
      const isNeighbor = hoveredTopic && hoveredTopic.neighbors && hoveredTopic.neighbors.includes(t.id);

      let r = 2.4 * Math.max(0.65, scale);
      if (isHovered || isSelected) r *= 2.6;
      else if (isNeighbor) r *= 1.8;

      // Aura on hover/select
      if (isHovered || isSelected || isNeighbor) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 10, 10, 0.08)';
        ctx.fill();
      }

      // Star point
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      
      let starColor = '#2563eb'; // Sec 1
      if (t.section.startsWith('2')) starColor = '#d97706'; // Sec 2
      if (t.section.startsWith('3')) starColor = '#059669'; // Sec 3

      ctx.fillStyle = isHovered ? '#0a0a0a' : starColor;
      ctx.fill();

      // Small topic title label if zoomed in close
      if (scale > 2.0) {
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = isHovered ? '#0a0a0a' : '#737373';
        ctx.fillText(t.topic.slice(0, 32) + (t.topic.length > 32 ? '...' : ''), p.x + r + 5, p.y + 4);
      }
    });
  }

  // -------------------------------------------------------------
  // TOUCHPAD, MOUSE & MOBILE TOUCH ENGINE
  // -------------------------------------------------------------

  // Mouse drag
  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', e => {
    if (isDragging) {
      offsetX = e.clientX - dragStartX;
      offsetY = e.clientY - dragStartY;
      requestAnimationFrame(renderGalaxy);
      tooltip.style.display = 'none';
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldMouse = screenToWorld(mouseX, mouseY);

    let closest = null;
    let minDist = 20 / scale;

    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      const dist = Math.hypot(t.x - worldMouse.x, t.y - worldMouse.y);
      if (dist < minDist) {
        minDist = dist;
        closest = t;
      }
    }

    if (closest !== hoveredTopic) {
      hoveredTopic = closest;
      canvas.style.cursor = closest ? 'pointer' : 'grab';
      requestAnimationFrame(renderGalaxy);

      if (closest && window.innerWidth > 768) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${Math.min(mouseX + 15, width - 320)}px`;
        tooltip.style.top = `${Math.min(mouseY + 15, height - 120)}px`;

        document.getElementById('tt-sec').textContent = `[Раздел ${closest.section}] ${closest.cluster_name}`;
        document.getElementById('tt-title').textContent = `#${closest.id}. ${closest.topic}`;
        const heroesStr = (closest.args || []).map(a => a.hero).filter(Boolean).join(' vs ');
        document.getElementById('tt-heroes').textContent = `Герои: ${heroesStr}`;
      } else {
        tooltip.style.display = 'none';
      }
    }
  });

  // Touchpad 2-finger pan & pinch-zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey) {
      const zoomFactor = Math.exp(-e.deltaY * 0.015);
      zoomAt(mouseX, mouseY, zoomFactor);
    } else if (Math.abs(e.deltaX) > 0 || (e.deltaMode === 0 && Math.abs(e.deltaY) < 35)) {
      offsetX -= e.deltaX;
      offsetY -= e.deltaY;
      requestAnimationFrame(renderGalaxy);
    } else {
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomAt(mouseX, mouseY, zoomFactor);
    }
  }, { passive: false });

  // Mobile Touch Gestures (Pinch to Zoom & Touch Pan with Tap Detection)
  let touchStartDist = 0;
  let touchStartScale = 1;
  let touchStartOffset = { x: 0, y: 0 };
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };
  let touchMoveDistTotal = 0;

  canvas.addEventListener('touchstart', e => {
    touchStartTime = performance.now();
    touchMoveDistTotal = 0;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      isDragging = true;
      dragStartX = t.clientX - offsetX;
      dragStartY = t.clientY - offsetY;
      touchStartPos = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      isDragging = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartScale = scale;
      touchStartOffset = { x: offsetX, y: offsetY };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      touchMoveDistTotal += Math.hypot(t.clientX - (dragStartX + offsetX), t.clientY - (dragStartY + offsetY));
      offsetX = t.clientX - dragStartX;
      offsetY = t.clientY - dragStartY;
      requestAnimationFrame(renderGalaxy);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = dist / Math.max(touchStartDist, 1);
      const newScale = Math.min(Math.max(touchStartScale * factor, 0.15), 4.5);
      
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      
      offsetX = midX - (midX - touchStartOffset.x) * (newScale / touchStartScale);
      offsetY = midY - (midY - touchStartOffset.y) * (newScale / touchStartScale);
      scale = newScale;
      requestAnimationFrame(renderGalaxy);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    const elapsed = performance.now() - touchStartTime;

    // Detect distinct tap vs pan
    if (e.changedTouches.length === 1 && elapsed < 350 && touchMoveDistTotal < 12) {
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const mouseX = t.clientX - rect.left;
      const mouseY = t.clientY - rect.top;
      const worldMouse = screenToWorld(mouseX, mouseY);

      // Thumb-friendly mobile hit radius
      let closest = null;
      let minScreenDist = 32; // 32px touch target radius

      for (let i = 0; i < topics.length; i++) {
        const topItem = topics[i];
        const screenP = worldToScreen(topItem.x, topItem.y);
        const screenDist = Math.hypot(screenP.x - mouseX, screenP.y - mouseY);
        if (screenDist < minScreenDist) {
          minScreenDist = screenDist;
          closest = topItem;
        }
      }

      if (closest) {
        haptic(20);
        openDrawer(closest);
      }
    }
    isDragging = false;
  });

  canvas.addEventListener('click', () => {
    if (hoveredTopic) {
      haptic(15);
      openDrawer(hoveredTopic);
    }
  });

  // Map Controls Buttons
  document.getElementById('ctrl-zoom-in').addEventListener('click', () => {
    haptic(10);
    zoomAt(width / 2, height / 2, 1.35);
  });
  document.getElementById('ctrl-zoom-out').addEventListener('click', () => {
    haptic(10);
    zoomAt(width / 2, height / 2, 0.74);
  });
  document.getElementById('ctrl-reset').addEventListener('click', () => {
    haptic(10);
    flyTo(0, 0, 0.38, 600);
  });

  // -------------------------------------------------------------
  // TOPIC DRAWER & MOBILE BOTTOM SHEET
  // -------------------------------------------------------------
  const drawer = document.getElementById('topic-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerBody = document.getElementById('drawer-body');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerDragHandle = document.getElementById('drawer-drag-handle');
  const drawerHeroNav = document.getElementById('drawer-hero-nav');

  function openDrawer(t) {
    activeTopic = t;
    renderDrawer(t);
    drawer.classList.add('open');
    if (drawerBackdrop) drawerBackdrop.classList.add('active');
    requestAnimationFrame(renderGalaxy);
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    activeTopic = null;
    requestAnimationFrame(renderGalaxy);
  }

  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // Mobile Drag-to-dismiss gesture for bottom sheet
  let drawerTouchStartY = 0;
  let drawerCurrentY = 0;

  function initDrawerSwipeToDismiss() {
    const handleArea = drawerDragHandle || drawer.querySelector('.drawer-header');
    if (!handleArea) return;

    handleArea.addEventListener('touchstart', e => {
      drawerTouchStartY = e.touches[0].clientY;
      drawerCurrentY = drawerTouchStartY;
    }, { passive: true });

    handleArea.addEventListener('touchmove', e => {
      drawerCurrentY = e.touches[0].clientY;
      const deltaY = drawerCurrentY - drawerTouchStartY;
      if (deltaY > 0) {
        drawer.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    handleArea.addEventListener('touchend', () => {
      const deltaY = drawerCurrentY - drawerTouchStartY;
      drawer.style.transform = '';
      if (deltaY > 70) {
        haptic(15);
        closeDrawer();
      }
    });
  }
  initDrawerSwipeToDismiss();

  function renderDrawer(t) {
    document.getElementById('drawer-sec-badge').textContent = `Раздел ${t.section}`;
    document.getElementById('drawer-cluster-tag').textContent = t.cluster_name || 'Кластер';
    document.getElementById('drawer-topic-title').textContent = `#${t.id}. ${t.topic}`;

    // Render interactive hero chips
    if (drawerHeroNav) {
      const argsList = t.args || [];
      if (argsList.length > 0) {
        let chipsHtml = `<span style="font-size: 0.72rem; color: var(--color-mid-gray); margin-right: 4px;">Герои:</span>`;
        argsList.forEach((arg, idx) => {
          chipsHtml += `<button class="drawer-hero-chip" data-idx="${idx}">${arg.hero}</button>`;
        });
        drawerHeroNav.innerHTML = chipsHtml;
        drawerHeroNav.style.display = 'flex';

        drawerHeroNav.querySelectorAll('.drawer-hero-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const idx = parseInt(chip.dataset.idx, 10);
            haptic(10);
            const targetArg = drawerBody.querySelectorAll('.arg-card')[idx];
            if (targetArg) {
              targetArg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              targetArg.classList.add('target-highlight');
              setTimeout(() => targetArg.classList.remove('target-highlight'), 1200);
            }
          });
        });
      } else {
        drawerHeroNav.style.display = 'none';
      }
    }

    let html = '';

    if (t.warning) {
      html += `
        <div style="background: #fef2f2; border: 1px solid var(--color-ember); color: var(--color-ember); padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem;">
          <strong>Предостережение:</strong> ${t.warning}
        </div>
      `;
    }

    // Thesis Block
    html += `
      <div class="card-block">
        <div class="block-title">
          <span>Тезис сочинения</span>
          <span style="font-size: 0.75rem; color: var(--color-ink);">★ ${t.score || 10}/10</span>
        </div>
        <div class="thesis-text">${t.thesis}</div>
      </div>
    `;

    // Arguments Block
    if (isSelfTestMode) {
      html += `
        <div class="card-block" style="text-align: center; padding: 1.75rem;">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔒</div>
          <div style="font-weight: 600; color: var(--color-ink); margin-bottom: 0.35rem;">Режим тренировки</div>
          <p style="font-size: 0.85rem; color: var(--color-mid-gray); margin-bottom: 1rem;">
            Попробуйте сначала сами сформулировать два литературных аргумента по канону Росмэн.
          </p>
          <button class="btn-primary" id="btn-reveal-args" style="margin: 0 auto;">
            Раскрыть готовый разбор
          </button>
        </div>
      `;
    } else {
      html += `<div class="block-title" style="margin-top: 0.5rem;">Литературные аргументы (Канон Росмэн)</div>`;

      (t.args || []).forEach((arg, i) => {
        html += `
          <div class="arg-card" id="arg-card-${i}">
            <div class="arg-header">
              <span class="arg-hero">Аргумент #${i + 1}: ${arg.hero}</span>
              <span class="arg-book">${arg.book}</span>
            </div>
            
            <div class="arg-section-title">Сюжетная линия:</div>
            <div class="arg-desc">${arg.plot}</div>

            <div class="arg-section-title">Анализ и рассуждение:</div>
            <div class="arg-desc">${arg.analysis}</div>

            ${arg.quote ? `<div class="arg-quote">«${arg.quote}»</div>` : ''}

            ${arg.conclusion_micro ? `
              <div style="margin-top: 0.6rem; font-size: 0.8rem; color: var(--color-mid-gray);">
                ↳ <strong>Микровывод:</strong> ${arg.conclusion_micro}
              </div>
            ` : ''}
          </div>
        `;
      });
    }

    drawerBody.innerHTML = html;

    if (isSelfTestMode) {
      const btnReveal = document.getElementById('btn-reveal-args');
      if (btnReveal) {
        btnReveal.addEventListener('click', () => {
          isSelfTestMode = false;
          haptic(15);
          btnSelfTest.classList.remove('active');
          const btnTextDesk = btnSelfTest.querySelector('.btn-text-desktop');
          const btnTextMob = btnSelfTest.querySelector('.btn-text-mobile');
          if (btnTextDesk) btnTextDesk.textContent = 'Самопроверка';
          if (btnTextMob) btnTextMob.textContent = 'Тест';
          renderDrawer(t);
        });
      }
    }
  }

  // Copy Full Essay Breakdown
  const btnCopyFull = document.getElementById('btn-copy-full');
  const toast = document.getElementById('toast');

  function showToast(msg = 'Разбор скопирован в буфер обмена!') {
    haptic(30);
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  if (btnCopyFull) {
    btnCopyFull.addEventListener('click', () => {
      if (!activeTopic) return;
      const t = activeTopic;

      let text = `ТЕМА ИТОГОВОГО СОЧИНЕНИЯ: «${t.topic}» (Раздел ${t.section})\n\n`;
      text += `ТЕЗИС:\n${t.thesis}\n\n`;

      (t.args || []).forEach((arg, idx) => {
        text += `АРГУМЕНТ ${idx + 1} (${arg.hero} — ${arg.book}):\n`;
        text += `Сюжет: ${arg.plot}\n`;
        text += `Анализ: ${arg.analysis}\n`;
        if (arg.quote) text += `Цитата: «${arg.quote}»\n`;
        if (arg.conclusion_micro) text += `Микровывод: ${arg.conclusion_micro}\n`;
        text += `\n`;
      });

      navigator.clipboard.writeText(text).then(() => {
        showToast('Готовый разбор скопирован!');
      });
    });
  }

  // -------------------------------------------------------------
  // LIST / SEARCH VIEW WITH RESPONSIVE PAGINATION & QUICK CHIPS
  // -------------------------------------------------------------
  const topicsGrid = document.getElementById('topics-grid');
  const filterSearch = document.getElementById('filter-search');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const filterSection = document.getElementById('filter-section');
  const filterCluster = document.getElementById('filter-cluster');
  const filterHero = document.getElementById('filter-hero');
  const topicsCounter = document.getElementById('topics-counter');
  const paginationBar = document.getElementById('pagination-bar');
  const selectPerPage = document.getElementById('select-per-page');
  const quickChipsBar = document.getElementById('quick-chips-bar');
  const filterToggleBtn = document.getElementById('filter-toggle-btn');
  const filtersCollapsible = document.getElementById('filters-collapsible');
  const filterActiveDot = document.getElementById('filter-active-dot');

  function updateFilterActiveDot() {
    const isSectionActive = filterSection && filterSection.value !== 'all';
    const isClusterActive = filterCluster && filterCluster.value !== 'all';
    const isHeroActive = filterHero && filterHero.value !== 'all';
    const hasActiveFilter = isSectionActive || isClusterActive || isHeroActive;
    if (filterActiveDot) {
      filterActiveDot.style.display = hasActiveFilter ? 'block' : 'none';
    }
  }

  if (filterToggleBtn && filtersCollapsible) {
    filterToggleBtn.addEventListener('click', () => {
      haptic(10);
      const isOpen = filtersCollapsible.classList.toggle('open');
      filterToggleBtn.classList.toggle('active', isOpen);
    });
  }

  // Populate Filter Selectors
  const clusterSet = new Set();
  topics.forEach(t => { if (t.cluster_name) clusterSet.add(t.cluster_name); });
  Array.from(clusterSet).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterCluster.appendChild(opt);
  });

  heroes.slice(0, 80).forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.name;
    opt.textContent = `${h.name} (${h.count})`;
    filterHero.appendChild(opt);
  });

  // Search Clear Button handling
  if (filterSearch && searchClearBtn) {
    filterSearch.addEventListener('input', () => {
      searchClearBtn.style.display = filterSearch.value ? 'flex' : 'none';
      currentPage = 1;
      renderList();
    });

    searchClearBtn.addEventListener('click', () => {
      filterSearch.value = '';
      searchClearBtn.style.display = 'none';
      filterSearch.focus();
      currentPage = 1;
      renderList();
    });
  }

  // Quick One-Tap Filter Chips Ribbon
  if (quickChipsBar) {
    quickChipsBar.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic(10);
        quickChipsBar.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const f = btn.dataset.filter;
        if (f === 'all') {
          filterSection.value = 'all';
          filterCluster.value = 'all';
          filterHero.value = 'all';
        } else if (f === 'sec-1') {
          filterSection.value = '1';
        } else if (f === 'sec-2') {
          filterSection.value = '2';
        } else if (f === 'sec-3') {
          filterSection.value = '3';
        } else if (f === 'top-score') {
          filterSection.value = 'all';
          filterCluster.value = 'all';
          filterHero.value = 'all';
        } else if (f.startsWith('hero-')) {
          const heroName = f.replace('hero-', '');
          filterHero.value = heroName;
        }

        currentPage = 1;
        updateFilterActiveDot();
        renderList();
      });
    });
  }

  function getFilteredTopics() {
    const query = filterSearch ? filterSearch.value.trim().toLowerCase() : '';
    const secVal = filterSection ? filterSection.value : 'all';
    const clusterVal = filterCluster ? filterCluster.value : 'all';
    const heroVal = filterHero ? filterHero.value : 'all';

    // Active quick chip check
    const activeChip = quickChipsBar ? quickChipsBar.querySelector('.chip-btn.active') : null;
    const onlyTopScore = activeChip && activeChip.dataset.filter === 'top-score';

    return topics.filter(t => {
      if (onlyTopScore && t.score < 10) return false;

      if (secVal !== 'all') {
        if (secVal.length === 1 && !t.section.startsWith(secVal)) return false;
        if (secVal.length > 1 && t.section !== secVal) return false;
      }
      if (clusterVal !== 'all' && t.cluster_name !== clusterVal) return false;
      if (heroVal !== 'all') {
        const hasHero = (t.args || []).some(a => a.hero.toLowerCase().includes(heroVal.toLowerCase()));
        if (!hasHero) return false;
      }
      if (query) {
        const fullTxt = `${t.topic} ${t.thesis} ${(t.args || []).map(a => a.hero + ' ' + a.quote).join(' ')}`.toLowerCase();
        if (!fullTxt.includes(query)) return false;
      }
      return true;
    });
  }

  function renderList() {
    const filtered = getFilteredTopics();
    const total = filtered.length;

    if (topicsCounter) {
      topicsCounter.textContent = `Найдено ${total.toLocaleString('ru-RU')} тем (из 1 709)`;
    }

    const perPage = selectPerPage.value === 'all' ? total : parseInt(selectPerPage.value, 10);
    const totalPages = Math.ceil(total / perPage) || 1;

    if (currentPage > totalPages) currentPage = 1;

    const startIdx = (currentPage - 1) * perPage;
    const pageItems = filtered.slice(startIdx, startIdx + perPage);

    let html = '';
    pageItems.forEach(t => {
      const heroesStr = (t.args || []).map(a => `<span class="hero-tag">${a.hero}</span>`).join('');
      html += `
        <div class="topic-card" data-id="${t.id}">
          <div>
            <div class="card-top">
              <span class="card-id-badge">#${t.id} • Раздел ${t.section}</span>
              <span class="card-score">★ ${t.score || 10}/10</span>
            </div>
            <h3 class="card-topic-title">${t.topic}</h3>
            ${t.cluster_name ? `<span class="card-cluster-pill">${t.cluster_name}</span>` : ''}
          </div>
          <div>
            <div class="card-heroes-row">${heroesStr}</div>
          </div>
        </div>
      `;
    });

    if (filtered.length === 0) {
      html = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--color-mid-gray);">Ничего не найдено по заданным фильтрам</div>`;
    }

    topicsGrid.innerHTML = html;

    // Attach click to open drawer
    topicsGrid.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', () => {
        haptic(15);
        const id = parseInt(card.dataset.id, 10);
        const t = topics[id - 1];
        if (t) openDrawer(t);
      });
    });

    renderPaginationResponsive(totalPages);
  }

  function renderPaginationResponsive(totalPagesOverride) {
    if (!paginationBar) return;
    const filtered = getFilteredTopics();
    const perPage = selectPerPage.value === 'all' ? filtered.length : parseInt(selectPerPage.value, 10);
    const totalPages = totalPagesOverride !== undefined ? totalPagesOverride : (Math.ceil(filtered.length / perPage) || 1);

    if (totalPages <= 1) {
      paginationBar.innerHTML = '';
      return;
    }

    const isMobile = window.innerWidth <= 768;

    let phtml = '';

    if (isMobile) {
      // Mobile-friendly compact pagination
      phtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 360px; gap: 0.5rem;">
          <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-p="${currentPage - 1}">◀ Назад</button>
          <span style="font-size: 0.82rem; font-weight: 500; color: var(--color-ink);">Стр. ${currentPage} из ${totalPages}</span>
          <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-p="${currentPage + 1}">Вперёд ▶</button>
        </div>
      `;
    } else {
      // Desktop full pagination
      phtml += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-p="${currentPage - 1}">◀ Назад</button>`;

      let pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
          pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }

      pages.forEach(p => {
        if (p === '...') {
          phtml += `<span style="padding: 0 4px; color: var(--color-mid-gray);">...</span>`;
        } else {
          phtml += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-p="${p}">${p}</button>`;
        }
      });

      phtml += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-p="${currentPage + 1}">Вперёд ▶</button>`;
    }

    paginationBar.innerHTML = phtml;

    paginationBar.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.p, 10);
        if (p && p !== currentPage && p >= 1 && p <= totalPages) {
          haptic(10);
          currentPage = p;
          renderList();
          const wrap = document.querySelector('.topics-grid-wrap');
          if (wrap) wrap.scrollTop = 0;
        }
      });
    });
  }

  filterSection.addEventListener('change', () => { updateFilterActiveDot(); currentPage = 1; renderList(); });
  filterCluster.addEventListener('change', () => { updateFilterActiveDot(); currentPage = 1; renderList(); });
  filterHero.addEventListener('change', () => { updateFilterActiveDot(); currentPage = 1; renderList(); });
  selectPerPage.addEventListener('change', () => { currentPage = 1; renderList(); });
  renderList();

  // -------------------------------------------------------------
  // EXAM ROULETTE (6 TOPICS STRICT FIPI TICKET)
  // -------------------------------------------------------------
  const modal = document.getElementById('roulette-modal');
  const btnOpenRoulette = document.getElementById('btn-open-roulette');
  const btnRerollRoulette = document.getElementById('btn-reroll-roulette');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const ticketTopicsList = document.getElementById('ticket-topics-list');

  function getRandom(arr, n) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  function generateTicket() {
    haptic(25);
    const sec1Topics = topics.filter(t => t.section.startsWith('1') && t.score >= 7);
    const sec2Topics = topics.filter(t => t.section.startsWith('2') && t.score >= 7);
    const sec3Topics = topics.filter(t => t.section.startsWith('3') && t.score >= 7);

    const ticket = [
      ...getRandom(sec1Topics, 2),
      ...getRandom(sec2Topics, 2),
      ...getRandom(sec3Topics, 2)
    ];

    let html = '';
    ticket.forEach((t, idx) => {
      html += `
        <div class="ticket-item" data-id="${t.id}">
          <div style="display: flex; align-items: center; gap: 0.85rem; min-width: 0;">
            <span class="ticket-num">${idx + 1}.</span>
            <div style="min-width: 0;">
              <div class="ticket-text">${t.topic}</div>
              <div style="font-size: 0.75rem; color: var(--color-mid-gray); margin-top: 2px;">
                Раздел ${t.section} • ${t.cluster_name || ''}
              </div>
            </div>
          </div>
          <span style="font-size: 0.8rem; color: var(--color-ink); font-weight: 500; white-space: nowrap; margin-left: 0.5rem;">Разобрать ➔</span>
        </div>
      `;
    });

    ticketTopicsList.innerHTML = html;

    ticketTopicsList.querySelectorAll('.ticket-item').forEach(item => {
      item.addEventListener('click', () => {
        haptic(15);
        const id = parseInt(item.dataset.id, 10);
        modal.classList.remove('open');
        const t = topics[id - 1];
        if (t) openDrawer(t);
      });
    });
  }

  if (btnOpenRoulette) {
    btnOpenRoulette.addEventListener('click', () => {
      generateTicket();
      modal.classList.add('open');
    });
  }
  if (btnRerollRoulette) btnRerollRoulette.addEventListener('click', generateTicket);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => modal.classList.remove('open'));
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  // -------------------------------------------------------------
  // HEROES VIEW (183 POTTERIANA CHARACTERS)
  // -------------------------------------------------------------
  const heroesGrid = document.getElementById('heroes-grid');
  const heroSearch = document.getElementById('hero-search');

  function renderHeroes() {
    const q = heroSearch.value.trim().toLowerCase();
    const filtered = heroes.filter(h => h.name.toLowerCase().includes(q));

    let html = '';
    filtered.forEach(h => {
      const topClusters = (h.top_clusters || []).slice(0, 2).join(' • ');
      html += `
        <div class="hero-card" data-hero="${h.name}">
          <div class="hero-card-name">
            <span>${h.name}</span>
            <span class="hero-card-count">${h.count} тем</span>
          </div>
          <div class="hero-card-sub">${topClusters || 'Персонаж саги'}</div>
          ${h.quotes && h.quotes[0] ? `
            <div class="hero-card-quote">
              «${h.quotes[0].slice(0, 90)}...»
            </div>
          ` : ''}
        </div>
      `;
    });

    if (filtered.length === 0) {
      html = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--color-mid-gray);">Персонаж не найден</div>`;
    }

    heroesGrid.innerHTML = html;

    heroesGrid.querySelectorAll('.hero-card').forEach(card => {
      card.addEventListener('click', () => {
        haptic(15);
        const heroName = card.dataset.hero;
        switchTab('list');
        filterHero.value = heroName;
        currentPage = 1;
        updateFilterActiveDot();
        renderList();
      });
    });
  }

  if (heroSearch) heroSearch.addEventListener('input', renderHeroes);

  // -------------------------------------------------------------
  // QUOTES VIEW (2 827 CANONICAL ROSMAN QUOTES)
  // -------------------------------------------------------------
  const quotesList = document.getElementById('quotes-list');
  const quoteSearch = document.getElementById('quote-search');

  function renderQuotes() {
    const q = quoteSearch.value.trim().toLowerCase();
    const filtered = quotes.filter(item => 
      item.quote.toLowerCase().includes(q) || 
      item.hero.toLowerCase().includes(q)
    );

    let html = '';
    filtered.slice(0, 120).forEach(item => {
      html += `
        <div class="quote-item" data-quote="${item.quote.replace(/"/g, '&quot;')}">
          <div>
            <div class="quote-text">«${item.quote}»</div>
            <div class="quote-meta">— ${item.hero} (${item.book}) • Тема #${item.topic_id}</div>
          </div>
          <button class="btn-secondary btn-copy-quote" data-quote="${item.quote.replace(/"/g, '&quot;')}">
            Копировать
          </button>
        </div>
      `;
    });

    if (filtered.length === 0) {
      html = `<div style="text-align: center; padding: 4rem; color: var(--color-mid-gray);">Цитаты не найдены</div>`;
    }

    quotesList.innerHTML = html;

    // Tapping button or entire quote item copies it
    quotesList.querySelectorAll('.quote-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const qText = item.dataset.quote;
        navigator.clipboard.writeText(`«${qText}»`).then(() => {
          showToast('Цитата скопирована!');
        });
      });
    });
  }

  if (quoteSearch) quoteSearch.addEventListener('input', renderQuotes);
});
