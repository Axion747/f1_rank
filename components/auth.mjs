import { html, supabase, useState } from '../lib/core.mjs';
import { useDialog, useToast } from '../lib/app-utils.mjs';
import { CloseIcon } from './app-components.mjs';

function AuthModal({ onClose }) {
  const dialogRef = useDialog(onClose);
  const showToast = useToast();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter an email address and password.');
      return;
    }
    if (mode === 'register' && !username.trim()) {
      setError('Please choose a username.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('Please use at least 8 characters for your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        showToast('Signed in.');
        onClose();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: displayName.trim() || username.trim(),
            },
          },
        });
        if (authError) throw authError;
        if (data.user && !data.session) {
          showToast('Account created. Check your email to confirm it.', 'info');
        } else {
          showToast(`Account created for ${displayName.trim() || username.trim()}.`);
        }
        onClose();
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return html`<div
    class="modal-overlay open"
    onClick=${(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      ref=${dialogRef}
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      tabIndex="-1"
    >
      <div class="auth-logo">
        <img
          src="./assets/logo.png"
          width="80"
          height="80"
          alt="F1 Rank 2026"
          style=${{ borderRadius: '12px' }}
        />
      </div>
      <div class="modal-header">
        <h2 class="modal-title" id="auth-modal-title">
          ${mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <button class="modal-close" onClick=${onClose} aria-label="Close">
          <${CloseIcon} />
        </button>
      </div>

      <form onSubmit=${handleSubmit}>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            class="form-input"
            type="email"
            placeholder="you@example.com"
            value=${email}
            onInput=${(event) => setEmail(event.target.value)}
            autoFocus
            autocomplete="email"
          />
        </div>

        ${mode === 'register' &&
        html`
          <div class="form-group">
            <label class="form-label">Username</label>
            <input
              class="form-input"
              type="text"
              placeholder="Pick a username"
              value=${username}
              onInput=${(event) => setUsername(event.target.value)}
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label class="form-label"
              >Display Name
              <span style=${{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label
            >
            <input
              class="form-input"
              type="text"
              placeholder="How you want to be shown"
              value=${displayName}
              onInput=${(event) => setDisplayName(event.target.value)}
            />
          </div>
        `}

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            class="form-input"
            type="password"
            placeholder="Your password"
            value=${password}
            onInput=${(event) => setPassword(event.target.value)}
            autocomplete=${mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        ${error &&
        html`<p class="form-error" style=${{ marginBottom: 'var(--space-4)' }}>
          ${error}
        </p>`}

        <button
          class="btn btn-primary btn-lg"
          type="submit"
          style=${{ width: '100%' }}
          disabled=${loading}
        >
          ${loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div class="auth-toggle">
        ${mode === 'login'
          ? html`Need an account?
              <button
                type="button"
                class="auth-toggle-link"
                onClick=${() => {
                  setMode('register');
                  setError('');
                }}
              >
                Create one
              </button>`
          : html`Already have an account?
              <button
                type="button"
                class="auth-toggle-link"
                onClick=${() => {
                  setMode('login');
                  setError('');
                }}
              >
                Sign in
              </button>`}
      </div>
    </div>
  </div>`;
}

export function AuthGate() {
  const [showAuth, setShowAuth] = useState(false);

  return html`<div>
    <button class="btn btn-primary" onClick=${() => setShowAuth(true)}>
      Sign In
    </button>
    ${showAuth && html`<${AuthModal} onClose=${() => setShowAuth(false)} />`}
  </div>`;
}

export { AuthModal };
