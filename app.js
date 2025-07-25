(function() {
  'use strict';

  // Global application state
  const appState = {
    users: [],
    challenges: [],
    currentUser: null
  };

  // Helper functions
  function findUser(username) {
    return appState.users.find(user => user.username === username);
  }

  function findChallenge(id) {
    return appState.challenges.find(challenge => challenge.id === id);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  function calculateStreak(checkins) {
    if (!checkins || checkins.length === 0) return 0;
    
    const sortedDates = checkins.sort((a, b) => new Date(b) - new Date(a));
    const today = getToday();
    const yesterday = getYesterday();
    
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check if user checked in today or yesterday
    if (!sortedDates.includes(today) && !sortedDates.includes(yesterday)) {
      return 0;
    }
    
    // Start from today if checked in, otherwise yesterday
    if (!sortedDates.includes(today)) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (sortedDates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  function getStreakBadge(streak) {
    if (streak >= 30) return '🏆';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⭐';
    return '';
  }

  // View rendering functions
  function renderLanding() {
    return `
      <div class="text-center mb-8">
        <h1>Habit Hero</h1>
        <p class="color-text-secondary">Track your habits and build streaks with gamification!</p>
      </div>
      
      <div class="auth-container">
        <div class="card auth-card">
          <div class="card__body">
            <h3 class="mb-8">Register</h3>
            <form id="register-form" class="form-group">
              <div class="form-group">
                <label class="form-label" for="reg-username">Username</label>
                <input type="text" id="reg-username" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-password">Password</label>
                <input type="password" id="reg-password" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-confirm">Confirm Password</label>
                <input type="password" id="reg-confirm" class="form-control" required />
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn--primary">Register</button>
              </div>
            </form>
          </div>
        </div>
        
        <div class="card auth-card">
          <div class="card__body">
            <h3 class="mb-8">Login</h3>
            <form id="login-form" class="form-group">
              <div class="form-group">
                <label class="form-label" for="login-username">Username</label>
                <input type="text" id="login-username" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="login-password">Password</label>
                <input type="password" id="login-password" class="form-control" required />
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn--primary">Login</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function renderHome() {
    const createChallengeForm = `
      <div class="card mb-8">
        <div class="card__body">
          <h3 class="mb-8">Create New Challenge</h3>
          <form id="create-challenge-form">
            <div class="form-group">
              <label class="form-label" for="challenge-title">Challenge Title</label>
              <input type="text" id="challenge-title" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="challenge-description">Description</label>
              <textarea id="challenge-description" class="form-control" rows="3" required></textarea>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn--primary">Create Challenge</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const challengesList = appState.challenges.map(challenge => {
      const isParticipant = challenge.participants.includes(appState.currentUser.username);
      const buttonText = isParticipant ? 'Enter' : 'Join';
      const buttonClass = isParticipant ? 'btn--primary' : 'btn--secondary';
      
      return `
        <div class="card">
          <div class="card__body">
            <h4><a href="#challenge-${challenge.id}">${challenge.title}</a></h4>
            <p class="color-text-secondary mb-8">${challenge.description}</p>
            <div class="flex justify-between items-center">
              <div>
                <small class="color-text-secondary">Creator: ${challenge.creator}</small><br>
                <small class="color-text-secondary">Participants: ${challenge.participants.length}</small>
              </div>
              <button class="btn ${buttonClass}" onclick="handleChallengeAction('${challenge.id}')">${buttonText}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="flex justify-between items-center mb-8">
        <h2>Welcome, ${appState.currentUser.username}!</h2>
        <button class="btn btn--outline" onclick="logout()">Logout</button>
      </div>
      
      ${createChallengeForm}
      
      <div>
        <h3 class="mb-8">Live Challenges</h3>
        <div class="challenge-list">
          ${challengesList.length > 0 ? challengesList : '<p class="color-text-secondary">No challenges yet. Create your first challenge above!</p>'}
        </div>
      </div>
    `;
  }

  function renderChallenge(challengeId) {
    const challenge = findChallenge(challengeId);
    if (!challenge) {
      return '<p>Challenge not found.</p>';
    }

    const isParticipant = challenge.participants.includes(appState.currentUser.username);
    const userCheckins = challenge.checkins[appState.currentUser.username] || [];
    const currentStreak = calculateStreak(userCheckins);
    const streakBadge = getStreakBadge(currentStreak);
    
    const today = getToday();
    const yesterday = getYesterday();
    const checkedInToday = userCheckins.includes(today);
    const checkedInYesterday = userCheckins.includes(yesterday);

    const joinButton = !isParticipant ? `
      <button class="btn btn--primary mb-8" onclick="joinChallenge('${challengeId}')">Join Challenge</button>
    ` : '';

    const checkinSection = isParticipant ? `
      <div class="card mb-8">
        <div class="card__body">
          <h4 class="mb-8">Check-in</h4>
          <div class="flex gap-8 flex-wrap">
            <button class="btn ${checkedInToday ? 'btn--outline' : 'btn--primary'}" 
                    onclick="checkin('${challengeId}', '${today}')" 
                    ${checkedInToday ? 'disabled' : ''}>
              ${checkedInToday ? 'Already checked in today' : 'Check-in Today'}
            </button>
            <button class="btn ${checkedInYesterday ? 'btn--outline' : 'btn--secondary'}" 
                    onclick="checkin('${challengeId}', '${yesterday}')" 
                    ${checkedInYesterday ? 'disabled' : ''}>
              ${checkedInYesterday ? 'Already checked in yesterday' : 'Check-in Yesterday'}
            </button>
            ${checkedInToday ? `<button class="btn btn--outline" onclick="undoCheckin('${challengeId}', '${today}')">Undo Today</button>` : ''}
            ${checkedInYesterday ? `<button class="btn btn--outline" onclick="undoCheckin('${challengeId}', '${yesterday}')">Undo Yesterday</button>` : ''}
          </div>
        </div>
      </div>
    ` : '';

    const calendar = isParticipant ? renderCalendar(userCheckins) : '';

    return `
      <div class="flex justify-between items-center mb-8">
        <h2>${challenge.title}</h2>
        <button class="btn btn--outline" onclick="goHome()">Back to Home</button>
      </div>
      
      <div class="card mb-8">
        <div class="card__body">
          <p class="mb-8">${challenge.description}</p>
          <div class="flex justify-between items-center">
            <div>
              <small class="color-text-secondary">Creator: ${challenge.creator}</small><br>
              <small class="color-text-secondary">Participants: ${challenge.participants.join(', ')}</small>
            </div>
            ${isParticipant ? `<div class="streak-badge">
              ${streakBadge} Current Streak: ${currentStreak} days
            </div>` : ''}
          </div>
        </div>
      </div>
      
      ${joinButton}
      ${checkinSection}
      ${calendar}
    `;
  }

  function renderCalendar(checkins) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayDate = today.getDate();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    let calendarHTML = `
      <div class="card">
        <div class="card__body">
          <h4 class="mb-8 text-center">${monthNames[month]} ${year}</h4>
          <div class="calendar mb-8">
            <div class="day" style="font-weight: var(--font-weight-semibold);">Sun</div>
            <div class="day" style="font-weight: var(--font-weight-semibold);">Mon</div>
            <div class="day" style="font-weight: var(--font-weight-semibold);">Tue</div>
            <div class="day" style="font-weight: var(--font-weight-semibold);">Wed</div>
            <div class="day" style="font-weight: var(--font-weight-semibold);">Thu</div>
            <div class="day" style="font-weight: var(--font-weight-semibold);">Fri</div>
            <div class="day" style="font-weight: var(--font-weight-semibold);">Sat</div>
    `;
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startDate; i++) {
      calendarHTML += '<div class="day"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCheckedIn = checkins.includes(dateStr);
      const isToday = day === todayDate;
      
      let classes = 'day';
      if (isCheckedIn) classes += ' checked';
      if (isToday) classes += ' today';
      
      calendarHTML += `<div class="${classes}">${day}</div>`;
    }
    
    calendarHTML += '</div></div></div>';
    return calendarHTML;
  }

  // Event handlers
  function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (password !== confirm) {
      alert('Passwords do not match!');
      return;
    }

    if (findUser(username)) {
      alert('Username already exists!');
      return;
    }

    const newUser = {
      username,
      password,
      joinedChallenges: []
    };

    appState.users.push(newUser);
    appState.currentUser = newUser;
    window.location.hash = '#home';
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const user = findUser(username);
    if (!user || user.password !== password) {
      alert('Invalid username or password!');
      return;
    }

    appState.currentUser = user;
    window.location.hash = '#home';
  }

  function handleCreateChallenge(event) {
    event.preventDefault();
    const title = document.getElementById('challenge-title').value;
    const description = document.getElementById('challenge-description').value;

    const newChallenge = {
      id: generateId(),
      title,
      description,
      creator: appState.currentUser.username,
      participants: [appState.currentUser.username],
      checkins: {},
      createdAt: new Date().toISOString()
    };

    newChallenge.checkins[appState.currentUser.username] = [];
    appState.challenges.push(newChallenge);
    
    // Clear form
    document.getElementById('create-challenge-form').reset();
    
    // Re-render home page
    render();
  }

  // Global functions (attached to window for onclick handlers)
  window.handleChallengeAction = function(challengeId) {
    const challenge = findChallenge(challengeId);
    if (!challenge.participants.includes(appState.currentUser.username)) {
      joinChallenge(challengeId);
    } else {
      window.location.hash = `#challenge-${challengeId}`;
    }
  };

  window.joinChallenge = function(challengeId) {
    const challenge = findChallenge(challengeId);
    if (!challenge.participants.includes(appState.currentUser.username)) {
      challenge.participants.push(appState.currentUser.username);
      challenge.checkins[appState.currentUser.username] = [];
    }
    window.location.hash = `#challenge-${challengeId}`;
  };

  window.checkin = function(challengeId, date) {
    const challenge = findChallenge(challengeId);
    const userCheckins = challenge.checkins[appState.currentUser.username];
    
    if (!userCheckins.includes(date)) {
      userCheckins.push(date);
      render();
    }
  };

  window.undoCheckin = function(challengeId, date) {
    const challenge = findChallenge(challengeId);
    const userCheckins = challenge.checkins[appState.currentUser.username];
    const index = userCheckins.indexOf(date);
    
    if (index > -1) {
      userCheckins.splice(index, 1);
      render();
    }
  };

  window.goHome = function() {
    window.location.hash = '#home';
  };

  window.logout = function() {
    appState.currentUser = null;
    window.location.hash = '#login';
  };

  // Router
  function render() {
    const app = document.getElementById('app');
    const hash = window.location.hash.slice(1) || 'login';

    if (hash === 'login' || hash === '') {
      app.innerHTML = renderLanding();
      
      // Attach event listeners
      document.getElementById('register-form').addEventListener('submit', handleRegister);
      document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else if (hash === 'home') {
      if (!appState.currentUser) {
        window.location.hash = '#login';
        return;
      }
      
      app.innerHTML = renderHome();
      
      // Attach event listeners
      document.getElementById('create-challenge-form').addEventListener('submit', handleCreateChallenge);
    } else if (hash.startsWith('challenge-')) {
      if (!appState.currentUser) {
        window.location.hash = '#login';
        return;
      }
      
      const challengeId = hash.split('-')[1];
      app.innerHTML = renderChallenge(challengeId);
    } else {
      window.location.hash = '#login';
    }
  }

  // Initialize app
  window.addEventListener('hashchange', render);
  window.addEventListener('load', render);
})();