// public/guestbook.js
(function () {
  const base = "/";

  function initCharacterCounter() {
    var messageInput = document.getElementById('message');
    var charCount = document.getElementById('char-count');

    if (messageInput && charCount) {
      messageInput.removeEventListener('input', charCounterHandler);
      messageInput.addEventListener('input', charCounterHandler);
    }
  }

  function charCounterHandler() {
    var messageInput = document.getElementById('message');
    var charCount = document.getElementById('char-count');
    if (!messageInput || !charCount) return;

    var length = messageInput.value.length;
    charCount.textContent = length + ' / 50';

    if (length > 45) {
      charCount.style.color = '#ff0000';
    } else {
      charCount.style.color = '#666';
    }
  }

  var submitBtn = document.getElementById('submit-btn');
  var cooldownActive = false;

  function startCooldown() {
    if (!submitBtn) return;
    cooldownActive = true;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.3';
    submitBtn.style.cursor = 'not-allowed';

    var seconds = 30;
    submitBtn.textContent = 'wait ' + seconds + 's';

    var interval = setInterval(function () {
      seconds--;
      if (seconds > 0) {
        submitBtn.textContent = 'wait ' + seconds + 's';
      } else {
        clearInterval(interval);
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = 'sign';
        cooldownActive = false;
      }
    }, 1000);
  }

  function initFormHandler() {
    var form = document.getElementById('guestbook-form');
    if (form) {
      form.removeEventListener('submit', formSubmitHandler);
      form.addEventListener('submit', formSubmitHandler);
    }
  }

  async function formSubmitHandler(e) {
    e.preventDefault();

    if (cooldownActive) {
      return;
    }

    if (window.turnstile) {
      window.turnstile.reset();
    }

    startCooldown();

    var form = document.getElementById('guestbook-form');
    var formMessage = document.getElementById('form-message');
    if (!form || !formMessage) return;

    var formData = new FormData(form);
    var action = form.getAttribute('action') || base + 'api/guestbook';

    try {
      var response = await fetch(action, {
        method: 'POST',
        body: formData,
      });

      var result = await response.json();

      if (response.ok && result.success) {
        formMessage.style.display = 'block';
        formMessage.style.color = '#000000';
        formMessage.textContent = 'your message has been posted.';

        if (result.entry) {
          addEntryToDOM(result.entry);
        }

        form.reset();
        var charCount = document.getElementById('char-count');
        if (charCount) charCount.textContent = '0 / 50';
      } else {
        formMessage.style.display = 'block';
        formMessage.style.color = '#000000';
        formMessage.textContent =
          result.error || 'an error occurred. please refresh the page.';
        cooldownActive = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          submitBtn.textContent = 'sign';
        }
      }
    } catch (error) {
      formMessage.style.display = 'block';
      formMessage.style.color = '#000000';
      formMessage.textContent = 'an error occurred. please try again.';
      cooldownActive = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = 'sign';
      }
    } finally {
      if (window.turnstile) {
        window.turnstile.reset();
      }
    }
  }

  function formatDate(dateString) {
    var date = new Date(dateString);
    var months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ];
    var month = months[date.getMonth()];
    var day = date.getDate();
    var year = date.getFullYear();

    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    var minutesStr = minutes < 10 ? '0' + minutes : minutes;

    return month + ' ' + day + ' ' + year + ' ' + hours + ':' + minutesStr + ampm;
  }

  function addEntryToDOM(entry) {
    var container = document.getElementById('guestbook-entries');
    if (!container) return;

    var noEntries = container.querySelector('.no-entries');
    if (noEntries) noEntries.remove();

    var loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.remove();

    var entryHTML =
      '<div class="entry approved">' +
      '<div class="entry-header">' +
      '<span class="entry-name">' + escapeHtml(entry.name) + '</span>' +
      '<span class="entry-date">' + formatDate(entry.timestamp) + '</span>' +
      '</div>' +
      '<p class="entry-message">' + escapeHtml(entry.message) + '</p>' +
      '</div>';

    container.insertAdjacentHTML('afterbegin', entryHTML);
  }

  async function loadEntries() {
    var container = document.getElementById('guestbook-entries');
    if (!container) return;

    try {
      var response = await fetch(base + 'api/guestbook');
      var data = await response.json();

      var loadingMsg = document.getElementById('loading-message');
      if (loadingMsg) loadingMsg.remove();

      if (data.entries && data.entries.length > 0) {
        container.innerHTML = '';

        var entries = data.entries;
        for (var i = entries.length - 1; i >= 0; i--) {
          addEntryToDOM(entries[i]);
        }
      } else {
        container.innerHTML =
          '<p class="no-entries placeholder-message">no messages yet.</p>';
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      var loadingMsg = document.getElementById('loading-message');
      if (loadingMsg) {
        loadingMsg.textContent = 'failed to load messages. please refresh the page.';
      }
    }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initGuestbook() {
    initCharacterCounter();
    initFormHandler();
    loadEntries();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuestbook);
  } else {
    initGuestbook();
  }

  document.addEventListener('astro:page-load', function () {
    setTimeout(initGuestbook, 100);
  });
})();