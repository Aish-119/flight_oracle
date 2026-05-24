/* ============================================================
   CHATBOT.JS — Smooth AI Chat with Typing Indicators
   Flight Oracle
============================================================ */

let chatOpen = false;
let chatHistory = [];
let suggestionsDismissed = false;

// ── OPEN / CLOSE ──────────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chat-panel');
  const fab = document.getElementById('chat-fab');
  const badge = document.getElementById('chat-badge');

  panel.classList.toggle('open', chatOpen);

  if (chatOpen) {
    badge.style.display = 'none';
    // Scroll to bottom
    setTimeout(() => scrollChatBottom(), 100);
    // Focus input
    const input = document.getElementById('chat-input');
    if (input) setTimeout(() => input.focus(), 350);
  }
}

function scrollChatBottom() {
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ── SEND MESSAGE ──────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = (input.value || '').trim();
  if (!msg) return;

  input.value = '';
  hideSuggestions();

  // Add user message
  appendMessage('user', msg);

  // Show typing indicator
  const typingId = showTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();

    // Remove typing indicator
    removeTyping(typingId);

    if (data.reply) {
      appendMessage('bot', data.reply, data.timestamp);

      // Save to chat history on server
      if (typeof currentUser !== 'undefined' && currentUser) {
        fetch('/save_chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_msg: msg, bot_reply: data.reply })
        }).then(res => res.json()).then(d => {
          if (d.success) {
            // Refresh user stats
            fetch('/auth/me').then(r => r.json()).then(md => {
              if (md.success) { currentUser = md.user; updateUIForUser(md.user); }
            });
          }
        }).catch(() => {});
      }

      // Track history
      chatHistory.push({ user: msg, bot: data.reply, time: data.timestamp });

      // Show follow-up suggestions
      if (chatHistory.length > 0 && chatHistory.length % 3 === 0) {
        setTimeout(() => showContextSuggestions(msg), 600);
      }
    }
  } catch {
    removeTyping(typingId);
    appendMessage('bot', '⚠️ Connection issue. Please try again.', formatTime());
  }

  scrollChatBottom();
}

function sendSuggestion(btn) {
  const msg = btn.textContent;
  const input = document.getElementById('chat-input');
  if (input) input.value = msg;
  hideSuggestions();
  sendChat();
}

function hideSuggestions() {
  const sugg = document.getElementById('chat-suggestions');
  if (sugg && !suggestionsDismissed) {
    sugg.style.transition = 'opacity 0.3s, max-height 0.3s';
    sugg.style.opacity = '0';
    sugg.style.maxHeight = '0';
    sugg.style.overflow = 'hidden';
    sugg.style.padding = '0';
    setTimeout(() => { sugg.style.display = 'none'; }, 300);
    suggestionsDismissed = true;
  }
}

function showContextSuggestions(lastMsg) {
  // Dynamically show contextual follow-ups
  const sugg = document.getElementById('chat-suggestions');
  if (!sugg) return;

  let chips = [];
  if (lastMsg.toLowerCase().includes('airline')) {
    chips = ['Which airline has best service?', 'Compare IndiGo vs Vistara', 'Air India or SpiceJet?'];
  } else if (lastMsg.toLowerCase().includes('book') || lastMsg.toLowerCase().includes('cheap')) {
    chips = ['What time to fly for savings?', 'Direct vs connecting flights?', 'Use the predictor now'];
  } else if (lastMsg.toLowerCase().includes('model') || lastMsg.toLowerCase().includes('ai')) {
    chips = ['What is R² score?', 'Which features matter most?', 'How was it trained?'];
  } else {
    chips = ['Tell me about Business class', 'Best time to book', 'Cheapest airline?'];
  }

  sugg.innerHTML = chips.map(c =>
    `<button class="suggestion-chip" onclick="sendSuggestion(this)">${c}</button>`
  ).join('');
  sugg.style.display = 'flex';
  sugg.style.maxHeight = '60px';
  sugg.style.opacity = '1';
  sugg.style.overflow = '';
  sugg.style.padding = '';
  suggestionsDismissed = false;
}

// ── MESSAGE RENDERING ─────────────────────────────────────
function appendMessage(role, text, time) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;

  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.style.opacity = '0';
  div.style.transform = 'translateY(8px)';
  div.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  // Render markdown-like bold
  const formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  bubble.innerHTML = formattedText;

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = time || formatTime();

  div.appendChild(bubble);
  div.appendChild(timeDiv);
  msgs.appendChild(div);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    });
  });

  scrollChatBottom();
}

// ── TYPING INDICATOR ──────────────────────────────────────
let typingCounter = 0;

function showTyping() {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return null;

  const id = 'typing-' + (++typingCounter);
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = id;
  div.style.opacity = '0';
  div.style.transform = 'translateY(8px)';
  div.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

  div.innerHTML = `
    <div class="msg-bubble typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  msgs.appendChild(div);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    });
  });

  scrollChatBottom();
  return id;
}

function removeTyping(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    setTimeout(() => el.remove(), 200);
  }
}

// ── UTILS ─────────────────────────────────────────────────
function formatTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// Enter key to send
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // Show badge after 3 seconds if chat is closed
  setTimeout(() => {
    if (!chatOpen) {
      const badge = document.getElementById('chat-badge');
      if (badge) badge.style.display = 'flex';
    }
  }, 3000);
});
