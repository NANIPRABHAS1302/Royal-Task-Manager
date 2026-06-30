/**
 * ROYAL TASK MANAGER - CORE LOGIC & STATE CONTROLLER
 * Premium Vanilla JavaScript (ES6) Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================================================
  // APPLICATION STATE
  // ==========================================================================
  let tasks = [];
  let currentFilters = {
    status: 'all',     // 'all' | 'pending' | 'completed'
    priority: 'all',   // 'all' | 'high' | 'medium' | 'low'
    category: 'all',   // 'all' | 'work' | 'personal' | 'wellness' | 'shopping' | 'finance'
    search: ''
  };
  let currentSort = 'newest'; // 'newest' | 'oldest' | 'due-date' | 'priority'
  let activeTheme = 'dark';
  let autoSaveTimeout = null;
  let draggedItemId = null;
  let activeEditingTaskId = null;

  // Map category to color coordinates for sidebar dots
  const CATEGORIES = {
    work: { name: 'Work', color: '#00E5FF' },
    personal: { name: 'Personal', color: '#D4AF37' },
    wellness: { name: 'Wellness', color: '#10B981' },
    shopping: { name: 'Shopping', color: '#EC4899' },
    finance: { name: 'Finance', color: '#8B5CF6' }
  };

  const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

  // ==========================================================================
  // DOM ELEMENT SELECTION
  // ==========================================================================
  // Layout & Navigation
  const bodyEl = document.body;
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeText = document.getElementById('theme-text');
  const navItems = {
    all: document.getElementById('nav-all'),
    pending: document.getElementById('nav-pending'),
    completed: document.getElementById('nav-completed')
  };
  const categoryNavList = document.getElementById('category-nav-list');
  const shortcutBtn = document.getElementById('shortcut-btn');

  // Header & Search
  const searchInput = document.getElementById('search-input');
  const syncIndicator = document.getElementById('sync-indicator');
  const lastUpdatedText = document.getElementById('last-updated');

  // Stats Elements
  const statTotalEl = document.getElementById('stat-total-tasks');
  const statCompletedEl = document.getElementById('stat-completed-tasks');
  const statPendingEl = document.getElementById('stat-pending-tasks');
  const progressCircle = document.getElementById('progress-ring-circle');
  const progressText = document.getElementById('progress-percentage-text');
  const productivityPhrase = document.getElementById('productivity-phrase');

  // Controls Elements
  const tabButtons = {
    all: document.getElementById('tab-all'),
    pending: document.getElementById('tab-pending'),
    completed: document.getElementById('tab-completed')
  };
  const filterPrioritySelect = document.getElementById('filter-priority');
  const filterCategorySelect = document.getElementById('filter-category');
  const sortSelect = document.getElementById('sort-select');
  const addTaskBtn = document.getElementById('add-task-btn');

  // Task Board & List
  const tasksListContainer = document.getElementById('tasks-list');
  const emptyStateEl = document.getElementById('empty-state');
  const loadingSpinner = document.getElementById('loading-spinner');

  // Modals / Dialogs
  const taskDialog = document.getElementById('task-dialog');
  const taskForm = document.getElementById('task-form');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogCloseBtn = document.getElementById('dialog-close-btn');
  const dialogCancelBtn = document.getElementById('dialog-cancel-btn');
  const dialogSubmitBtn = document.getElementById('dialog-submit-btn');

  // Edit task input elements
  const taskIdInput = document.getElementById('task-id');
  const taskTitleInput = document.getElementById('task-title-input');
  const taskDescInput = document.getElementById('task-desc-input');
  const taskPriorityInput = document.getElementById('task-priority-input');
  const taskCategoryInput = document.getElementById('task-category-input');
  const taskDueDateInput = document.getElementById('task-due-date-input');

  // Modal Validation Errors
  const titleError = document.getElementById('title-error');
  const dateError = document.getElementById('date-error');

  // Confirm Delete Modal
  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  let pendingDeleteTaskId = null;

  // Shortcuts Dialog
  const shortcutDialog = document.getElementById('shortcut-dialog');
  const shortcutCloseBtn = document.getElementById('shortcut-close-btn');
  const shortcutOkBtn = document.getElementById('shortcut-ok-btn');

  // Toasts
  const toastContainer = document.getElementById('toast-container');

  // ==========================================================================
  // FLOATING BACKGROUND PARTICLES
  // ==========================================================================
  function initBackgroundParticles() {
    const container = document.getElementById('bg-particles');
    if (!container) return;
    container.innerHTML = '';
    
    // Config colors tailored to premium aesthetic
    const colors = ['#00E5FF', '#D4AF37', '#0F62FE', '#FF5E5E'];
    const particleCount = 6;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'bg-particle';
      const size = Math.floor(Math.random() * 200) + 180; // 180px - 380px
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 85}%`;
      particle.style.top = `${Math.random() * 85}%`;
      particle.style.background = `radial-gradient(circle, ${colors[i % colors.length]} 0%, rgba(0,0,0,0) 70%)`;
      particle.style.animationDelay = `${Math.random() * -20}s`;
      particle.style.animationDuration = `${Math.floor(Math.random() * 12) + 16}s`;
      
      container.appendChild(particle);
    }
  }

  // ==========================================================================
  // THEME MANAGEMENT
  // ==========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('royal_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      activeTheme = savedTheme;
    } else {
      activeTheme = prefersDark ? 'dark' : 'light';
    }
    
    applyTheme(activeTheme);
  }

  function applyTheme(theme) {
    bodyEl.setAttribute('data-theme', theme);
    localStorage.setItem('royal_theme', theme);
    activeTheme = theme;
    
    if (theme === 'dark') {
      themeText.textContent = 'Dark Mode';
    } else {
      themeText.textContent = 'Light Mode';
    }
  }

  function toggleTheme() {
    const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Theme shifted to ${nextTheme.toUpperCase()}`, 'info');
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS SERVICE
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose appropriate SVG icon based on theme
    let iconSvg = '';
    switch (type) {
      case 'success':
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        break;
      case 'warning':
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        break;
      case 'danger':
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        break;
      case 'info':
      default:
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        break;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close Notification">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    toastContainer.appendChild(toast);

    // Wire close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Auto-expire
    setTimeout(() => {
      removeToast(toast);
    }, 3500);
  }

  function removeToast(toast) {
    if (toast.parentNode) {
      toast.classList.add('toast-slide-out');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }
  }

  // ==========================================================================
  // STORAGE & SYNC (LOCALSTORAGE & AUTO-SAVE INDICATOR)
  // ==========================================================================
  function loadFromStorage() {
    const rawData = localStorage.getItem('royal_tasks');
    if (rawData) {
      try {
        tasks = JSON.parse(rawData);
      } catch (err) {
        showToast('Vault parsing error. Resetting storage.', 'danger');
        tasks = [];
      }
    } else {
      // Seed default tasks so workspace is not empty at first glance
      seedDemoData();
    }
  }

  function seedDemoData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    tasks = [
      {
        id: 'demo-1',
        title: 'Design Royal Task Manager System Architecture',
        description: 'Establish initial wireframes, data objects, HSL CSS variables, and layout shells for desktop & mobile.',
        priority: 'high',
        category: 'work',
        dueDate: todayStr,
        completed: true,
        order: 0,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'demo-2',
        title: 'Implement HTML5 Drag-and-Drop Task Reordering',
        description: 'Establish responsive visual placeholders and drop indicator lines. Sync modified layout state to LocalStorage.',
        priority: 'medium',
        category: 'work',
        dueDate: tomorrowStr,
        completed: false,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-3',
        title: 'Perform Weekly Financial Objectives Audit',
        description: 'Review expenses and budget logs. Consolidate digital receipts.',
        priority: 'low',
        category: 'finance',
        dueDate: tomorrowStr,
        completed: false,
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    saveToStorage(true); // Silent initial save
  }

  function triggerAutoSave() {
    // Show saving status
    syncIndicator.className = 'pulse-indicator status-saving';
    lastUpdatedText.textContent = 'Saving changes...';
    
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
      saveToStorage();
    }, 1500); // Let's auto-save after 1.5s of inactivity
  }

  // Wrap save to accept immediate/force saves
  function saveToStorage(silent = false) {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    localStorage.setItem('royal_tasks', JSON.stringify(tasks));
    
    // Update Sync UI
    syncIndicator.className = 'pulse-indicator status-green';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastUpdatedText.textContent = `Last updated: ${timeStr}`;

    if (!silent) {
      showToast('Task Ledger Autosaved', 'success');
    }
  }

  // ==========================================================================
  // PRODUCTIVITY STATISTICS CONTROLLER & COUNT-UP ANIMATION
  // ==========================================================================
  function animateCountUp(element, start, end, duration = 400) {
    let startTime = null;
    const startVal = parseInt(start) || 0;
    const endVal = parseInt(end) || 0;
    
    if (startVal === endVal) {
      element.textContent = endVal;
      return;
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out quad
      const easeVal = progress * (2 - progress);
      const current = Math.floor(startVal + (endVal - startVal) * easeVal);
      element.textContent = current;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = endVal;
      }
    }
    window.requestAnimationFrame(step);
  }

  function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Cache previous values for count-up triggers
    const prevTotal = parseInt(statTotalEl.textContent) || 0;
    const prevCompleted = parseInt(statCompletedEl.textContent) || 0;
    const prevPending = parseInt(statPendingEl.textContent) || 0;

    // Animate stats values
    animateCountUp(statTotalEl, prevTotal, total);
    animateCountUp(statCompletedEl, prevCompleted, completed);
    animateCountUp(statPendingEl, prevPending, pending);

    // Update Progress Ring SVG
    // Radius = 32, Perimeter = 201
    const perimeter = 201;
    const dashOffset = perimeter - (completionPercent / 100) * perimeter;
    progressCircle.style.strokeDashoffset = dashOffset;
    
    // Animate percent text
    const prevPercent = parseInt(progressText.textContent) || 0;
    animateCountUp(progressText, prevPercent, completionPercent);

    // Update Phrase
    let phrase = 'Embark on your journey';
    if (total === 0) {
      phrase = 'Kingdom is tranquil';
    } else if (completionPercent === 100) {
      phrase = 'Kingdom fully secured!';
    } else if (completionPercent >= 75) {
      phrase = 'Victory is near';
    } else if (completionPercent >= 50) {
      phrase = 'Commanding progress';
    } else if (completionPercent >= 25) {
      phrase = 'Sovereign steps';
    } else if (completionPercent > 0) {
      phrase = 'Objectives initiated';
    }
    productivityPhrase.textContent = phrase;

    // Update Sidebar Navigation Badges
    document.getElementById('badge-all-val').textContent = total;
    document.getElementById('badge-pending-val').textContent = pending;
    document.getElementById('badge-completed-val').textContent = completed;

    // Redraw sidebar quick filters
    renderSidebarCategoryFilters();
  }

  function renderSidebarCategoryFilters() {
    categoryNavList.innerHTML = '';
    
    Object.keys(CATEGORIES).forEach(key => {
      const catObj = CATEGORIES[key];
      const count = tasks.filter(t => t.category === key && !t.completed).length;
      
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.className = `nav-item ${currentFilters.category === key ? 'active' : ''}`;
      button.setAttribute('aria-label', `Filter by ${catObj.name} category`);
      
      // Handle navigation filter toggle
      button.addEventListener('click', () => {
        // Toggle category filter
        if (currentFilters.category === key) {
          currentFilters.category = 'all';
          filterCategorySelect.value = 'all';
        } else {
          currentFilters.category = key;
          filterCategorySelect.value = key;
        }
        
        // Match sidebar navigation state
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
        if (currentFilters.category === 'all') {
          // Fallback to active tab
          document.getElementById(`nav-${currentFilters.status}`).classList.add('active');
        } else {
          button.classList.add('active');
        }

        renderTasks();
      });

      button.innerHTML = `
        <span class="category-dot" style="background-color: ${catObj.color};"></span>
        <span>${catObj.name}</span>
        ${count > 0 ? `<span class="badge">${count}</span>` : ''}
      `;
      li.appendChild(button);
      categoryNavList.appendChild(li);
    });
  }

  // ==========================================================================
  // DIALOGS / MODAL MANAGEMENT & VALIDATION
  // ==========================================================================
  function openTaskDialog(task = null) {
    // Reset validations
    titleError.style.display = 'none';
    dateError.style.display = 'none';
    taskForm.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));

    if (task) {
      activeEditingTaskId = task.id;
      dialogTitle.textContent = 'Edit Royal Objective';
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskDescInput.value = task.description || '';
      taskPriorityInput.value = task.priority;
      taskCategoryInput.value = task.category;
      taskDueDateInput.value = task.dueDate;
      dialogSubmitBtn.textContent = 'Save Objective';
    } else {
      activeEditingTaskId = null;
      dialogTitle.textContent = 'Create New Objective';
      taskForm.reset();
      taskIdInput.value = '';
      
      // Default due date to today
      const todayStr = new Date().toISOString().split('T')[0];
      taskDueDateInput.value = todayStr;
      
      dialogSubmitBtn.textContent = 'Issue Objective';
    }
    
    taskDialog.showModal();
  }

  function closeTaskDialog() {
    taskDialog.close();
    taskForm.reset();
    activeEditingTaskId = null;
  }

  function validateTaskForm() {
    let isValid = true;
    
    // Title Validation
    if (!taskTitleInput.value.trim()) {
      taskTitleInput.parentElement.classList.add('has-error');
      titleError.style.display = 'block';
      isValid = false;
    } else {
      taskTitleInput.parentElement.classList.remove('has-error');
      titleError.style.display = 'none';
    }

    // Due Date Validation
    if (!taskDueDateInput.value) {
      taskDueDateInput.parentElement.classList.add('has-error');
      dateError.style.display = 'block';
      isValid = false;
    } else {
      taskDueDateInput.parentElement.classList.remove('has-error');
      dateError.style.display = 'none';
    }

    return isValid;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateTaskForm()) {
      showToast('Please fix the form errors', 'warning');
      return;
    }

    const id = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const priority = taskPriorityInput.value;
    const category = taskCategoryInput.value;
    const dueDate = taskDueDateInput.value;

    if (id) {
      // Editing mode
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          title,
          description,
          priority,
          category,
          dueDate,
          updatedAt: new Date().toISOString()
        };
        showToast('Objective parameters modified', 'success');
      }
    } else {
      // Create mode
      const newTask = {
        id: 'task-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        title,
        description,
        priority,
        category,
        dueDate,
        completed: false,
        order: tasks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      tasks.push(newTask);
      showToast('New Objective issued', 'success');
    }

    saveToStorage();
    closeTaskDialog();
    renderTasks();
    updateStatistics();
  }

  // Confirmation Delete Modal Handlers
  function openConfirmDelete(taskId) {
    pendingDeleteTaskId = taskId;
    confirmDialog.showModal();
  }

  function closeConfirmDelete() {
    confirmDialog.close();
    pendingDeleteTaskId = null;
  }

  function executeDelete() {
    if (pendingDeleteTaskId) {
      tasks = tasks.filter(t => t.id !== pendingDeleteTaskId);
      
      // Re-index remaining tasks order
      tasks.forEach((t, index) => {
        t.order = index;
      });

      saveToStorage();
      showToast('Objective dissolved', 'danger');
      closeConfirmDelete();
      renderTasks();
      updateStatistics();
    }
  }

  // Keyboard Shortcuts Dialog Handlers
  function toggleShortcutDialog() {
    if (shortcutDialog.open) {
      shortcutDialog.close();
    } else {
      shortcutDialog.showModal();
    }
  }

  // ==========================================================================
  // DYNAMIC RENDERING & HTML INJECTION
  // ==========================================================================
  function renderTasks() {
    // 1. Show loading spinner briefly to simulate server/vault load
    loadingSpinner.classList.add('active');
    tasksListContainer.setAttribute('aria-busy', 'true');
    
    // Simulate delay (400ms) for visual premium feel
    setTimeout(() => {
      loadingSpinner.classList.remove('active');
      tasksListContainer.setAttribute('aria-busy', 'false');
      
      // Fetch filtered & sorted items
      const filtered = getFilteredTasks();
      const sorted = getSortedTasks(filtered);

      tasksListContainer.innerHTML = '';
      
      if (sorted.length === 0) {
        emptyStateEl.classList.remove('hidden');
      } else {
        emptyStateEl.classList.add('hidden');
        
        sorted.forEach(task => {
          const taskCard = createTaskCard(task);
          tasksListContainer.appendChild(taskCard);
        });
      }
    }, 300);
  }

  function getFilteredTasks() {
    return tasks.filter(task => {
      // 1. Status Filter
      if (currentFilters.status === 'pending' && task.completed) return false;
      if (currentFilters.status === 'completed' && !task.completed) return false;
      
      // 2. Priority Filter
      if (currentFilters.priority !== 'all' && task.priority !== currentFilters.priority) return false;
      
      // 3. Category Filter
      if (currentFilters.category !== 'all' && task.category !== currentFilters.category) return false;
      
      // 4. Search Filter
      if (currentFilters.search) {
        const query = currentFilters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description && task.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }

  function getSortedTasks(taskList) {
    const listCopy = [...taskList];
    
    listCopy.sort((a, b) => {
      switch (currentSort) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'due-date':
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'priority':
          return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        case 'newest':
        default:
          // Check drag order if no other sorting is selected
          // If we drag-reordered, we should sort by order index, otherwise default to newest
          if (currentSort === 'newest') {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return a.order - b.order;
      }
    });

    // If no sorting filters are explicitly active, use drag order
    if (currentSort === 'drag-order') {
      listCopy.sort((a, b) => a.order - b.order);
    }

    return listCopy;
  }

  function createTaskCard(task) {
    const card = document.createElement('article');
    card.className = `task-item ${task.completed ? 'completed' : ''}`;
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', task.id);
    card.setAttribute('data-priority', task.priority);
    card.setAttribute('role', 'listitem');

    // Date calculations
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0,0,0,0);
    
    const isOverdue = !task.completed && dueDate < today;
    
    // Formatting date output
    let dateStr = task.dueDate;
    try {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      dateStr = new Date(task.dueDate).toLocaleDateString([], options);
    } catch(e) {}

    // Checkbox SVG checked representation
    const checkboxClass = task.completed ? 'checkbox-custom checked' : 'checkbox-custom';
    
    card.innerHTML = `
      <div class="task-check-wrapper">
        <button class="${checkboxClass}" aria-label="${task.completed ? 'Undo objective completion' : 'Complete objective'}" data-action="toggle-complete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>

      <div class="task-details-group">
        <div class="task-title-row">
          <h4 class="task-title">${escapeHTML(task.title)}</h4>
          <span class="badge-priority priority-${task.priority}">${task.priority}</span>
          <span class="badge-category">${escapeHTML(task.category)}</span>
        </div>
        ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
        
        <div class="task-meta-row">
          <div class="task-meta-item ${isOverdue ? 'overdue' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${isOverdue ? `Overdue - ${dateStr}` : `Due: ${dateStr}`}</span>
          </div>
        </div>
      </div>

      <div class="task-actions">
        <button class="btn-action-icon action-edit" aria-label="Edit Objective" data-action="edit-task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-action-icon action-delete" aria-label="Delete Objective" data-action="delete-task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;

    // Wire Card Click Actions
    const checkBtn = card.querySelector('[data-action="toggle-complete"]');
    const editBtn = card.querySelector('[data-action="edit-task"]');
    const deleteBtn = card.querySelector('[data-action="delete-task"]');

    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskCompletion(task.id);
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskDialog(task);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openConfirmDelete(task.id);
    });

    // Wire HTML5 Drag & Drop Listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('drop', handleDrop);

    return card;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // Task Action Toggles
  function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const isComplete = !tasks[taskIndex].completed;
      tasks[taskIndex].completed = isComplete;
      tasks[taskIndex].updatedAt = new Date().toISOString();
      
      saveToStorage();
      updateStatistics();
      renderTasks();
      
      if (isComplete) {
        showToast('Objective successfully resolved!', 'success');
      } else {
        showToast('Objective returned to pending list', 'warning');
      }
    }
  }

  // ==========================================================================
  // DRAG & DROP TASK REORDERING INTERACTIVE RATIONALE
  // ==========================================================================
  function handleDragStart(e) {
    draggedItemId = this.getAttribute('data-id');
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItemId);
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault(); 
    }
    e.dataTransfer.dropEffect = 'move';
    
    const targetId = this.getAttribute('data-id');
    if (targetId !== draggedItemId) {
      this.classList.add('drag-over');
    }
    return false;
  }

  function handleDragLeave() {
    this.classList.remove('drag-over');
  }

  function handleDragEnd() {
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('dragging');
      item.classList.remove('drag-over');
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const targetId = this.getAttribute('data-id');
    if (targetId === draggedItemId) return;

    // Retrieve indices from tasks
    const draggedIndex = tasks.findIndex(t => t.id === draggedItemId);
    const targetIndex = tasks.findIndex(t => t.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Splice elements to reorder
      const [draggedItem] = tasks.splice(draggedIndex, 1);
      tasks.splice(targetIndex, 0, draggedItem);

      // Re-assign order properties
      tasks.forEach((task, index) => {
        task.order = index;
      });

      // Override default sorting to maintain reordering on workspace
      currentSort = 'drag-order';
      sortSelect.value = 'drag-order';
      if (!sortSelect.querySelector('option[value="drag-order"]')) {
        const option = document.createElement('option');
        option.value = 'drag-order';
        option.textContent = 'Custom Drag Order';
        sortSelect.appendChild(option);
        sortSelect.value = 'drag-order';
      }

      saveToStorage();
      renderTasks();
      showToast('Objective priority order re-indexed', 'success');
    }
  }

  // ==========================================================================
  // INPUT CONTROLS, SEARCH, AND DROPDOWN LISTENERS
  // ==========================================================================
  
  // Search bar input filter (with debounce logic)
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilters.search = e.target.value;
      renderTasks();
    }, 200);
  });

  // Top tabs filter clicks (All, Pending, Completed)
  Object.keys(tabButtons).forEach(key => {
    const btn = tabButtons[key];
    btn.addEventListener('click', () => {
      // Toggle tabs active class
      Object.values(tabButtons).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      // Mirror in sidebar nav
      Object.values(navItems).forEach(item => item.classList.remove('active'));
      if (navItems[key]) navItems[key].classList.add('active');

      currentFilters.status = key;
      renderTasks();
    });
  });

  // Sidebar navigation filter clicks
  Object.keys(navItems).forEach(key => {
    const item = navItems[key];
    item.addEventListener('click', () => {
      Object.values(navItems).forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Clear category navigation focus
      currentFilters.category = 'all';
      filterCategorySelect.value = 'all';
      
      // Mirror in tabs
      Object.values(tabButtons).forEach(b => b.classList.remove('active'));
      if (tabButtons[key]) {
        tabButtons[key].classList.add('active');
        tabButtons[key].setAttribute('aria-selected', 'true');
      }

      currentFilters.status = key;
      renderTasks();
    });
  });

  // Priority Dropdown select
  filterPrioritySelect.addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    renderTasks();
  });

  // Category Dropdown select
  filterCategorySelect.addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    
    // De-focus sidebar categories
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
    if (currentFilters.category === 'all') {
      document.getElementById(`nav-${currentFilters.status}`).classList.add('active');
    }

    renderTasks();
  });

  // Sort dropdown change
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTasks();
  });

  // Dialog actions wiring
  addTaskBtn.addEventListener('click', () => openTaskDialog());
  dialogCloseBtn.addEventListener('click', closeTaskDialog);
  dialogCancelBtn.addEventListener('click', closeTaskDialog);
  taskForm.addEventListener('submit', handleFormSubmit);

  // Confirm delete modal wiring
  confirmCancelBtn.addEventListener('click', closeConfirmDelete);
  confirmDeleteBtn.addEventListener('click', executeDelete);

  // Help shortcut guide wiring
  shortcutBtn.addEventListener('click', toggleShortcutDialog);
  shortcutCloseBtn.addEventListener('click', () => shortcutDialog.close());
  shortcutOkBtn.addEventListener('click', () => shortcutDialog.close());

  // Theme toggle wiring
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Remove dialog on backdrop clicks
  window.addEventListener('click', (e) => {
    if (e.target === taskDialog) closeTaskDialog();
    if (e.target === confirmDialog) closeConfirmDelete();
    if (e.target === shortcutDialog) shortcutDialog.close();
  });

  // ==========================================================================
  // KEYBOARD SHORTCUTS REGISTRY SYSTEM
  // ==========================================================================
  window.addEventListener('keydown', (e) => {
    // Disable shortcuts if typing in input fields or textareas
    const activeTag = document.activeElement.tagName.toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      // Escape focuses out of input
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        openTaskDialog();
        break;
      case '/':
        e.preventDefault();
        searchInput.focus();
        break;
      case 'd':
      case 'l':
        e.preventDefault();
        toggleTheme();
        break;
      case '?':
        e.preventDefault();
        toggleShortcutDialog();
        break;
      default:
        break;
    }
  });

  // ==========================================================================
  // INITIALIZATION RUNNER
  // ==========================================================================
  initBackgroundParticles();
  initTheme();
  loadFromStorage();
  updateStatistics();
  renderTasks();

  // Resize listener to re-initialize particles for screen scaling
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      initBackgroundParticles();
    }, 400);
  });
});
