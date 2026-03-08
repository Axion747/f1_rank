import { html, supabase, useEffect, useState } from '../lib/core.mjs';
import { DRIVERS, TEAMS } from '../data/f1-data.mjs';
import { fallbackProfileSummary, loadProfileSummary, useAuth, useToast } from '../lib/app-utils.mjs';
import { buildProfileSummary, getDriver, getTeam } from '../lib/f1-utils.mjs';
import { InlineMessage, Spinner, TeamDot, UserIcon } from '../components/app-components.mjs';

export function ProfileView({ username }) {
  const auth = useAuth();
  const showToast = useToast();
  const [profileSummary, setProfileSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: '',
    bio: '',
    favorite_team: '',
    favorite_driver: '',
  });
  const [saving, setSaving] = useState(false);

  const isOwnProfile =
    auth.session && auth.profile && auth.profile.username === username;

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      setError('');

      try {
        const rpcSummary = await loadProfileSummary(username);
        if (cancelled) return;
        setProfileSummary(rpcSummary);
        setEditData({
          display_name: rpcSummary?.display_name || '',
          bio: rpcSummary?.bio || '',
          favorite_team: rpcSummary?.favorite_team || '',
          favorite_driver: rpcSummary?.favorite_driver || '',
        });
      } catch (rpcError) {
        try {
          const fallback = await fallbackProfileSummary(username);
          if (cancelled) return;
          const summary = buildProfileSummary(
            fallback.profile,
            fallback.userRankings,
            fallback.actualResults,
          );
          setProfileSummary(summary);
          setEditData({
            display_name: summary.display_name || '',
            bio: summary.bio || '',
            favorite_team: summary.favorite_team || '',
            favorite_driver: summary.favorite_driver || '',
          });
        } catch (fallbackError) {
          if (!cancelled) {
            setProfileSummary(null);
            setError(fallbackError.message || 'Unable to load this profile.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleSave = async () => {
    if (!auth.session) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: editData.display_name,
          bio: editData.bio,
          favorite_team: editData.favorite_team,
          favorite_driver: editData.favorite_driver,
        })
        .eq('id', auth.session.user.id);
      if (updateError) throw updateError;

      setProfileSummary((current) => ({
        ...current,
        ...editData,
      }));
      if (isOwnProfile && auth.refreshProfile) {
        await auth.refreshProfile();
      }
      setEditing(false);
      showToast('Profile updated.');
    } catch (saveError) {
      showToast('Unable to save profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return html`<${Spinner} />`;
  if (error) return html`<${InlineMessage} title="Profile unavailable" text=${error} />`;
  if (!profileSummary) {
    return html`<${InlineMessage}
      title="Profile not found"
      text="The requested profile could not be found."
    />`;
  }

  const favoriteTeam = profileSummary.favorite_team
    ? getTeam(profileSummary.favorite_team)
    : null;
  const favoriteDriver = profileSummary.favorite_driver
    ? getDriver(Number(profileSummary.favorite_driver))
    : null;
  const accuracyValue =
    profileSummary.accuracy?.accuracy !== undefined
      ? Number(profileSummary.accuracy.accuracy)
      : profileSummary.accuracy !== null && profileSummary.accuracy !== undefined
        ? Number(profileSummary.accuracy)
        : null;
  const hasAccuracy = accuracyValue !== null;
  const totalCorrect = hasAccuracy
    ? Number(profileSummary.accuracy?.total_correct ?? profileSummary.total_correct ?? 0)
    : null;
  const positionDiff =
    profileSummary.accuracy?.position_diff_avg ??
    profileSummary.position_diff_avg ??
    null;
  const scoredEvents = hasAccuracy
    ? Number(profileSummary.accuracy?.scored_events ?? profileSummary.scored_events ?? 0)
    : 0;
  const racesRanked = Number(profileSummary.races_ranked || 0);
  const teamColor = favoriteTeam?.color || 'var(--color-primary)';

  return html`<div class="profile-page">
    <div class="page-header">
      <h1 class="page-title">${profileSummary.display_name || profileSummary.username}</h1>
      <p class="page-subtitle">@${profileSummary.username}</p>
    </div>

    <div class="page-note">
      Accuracy only includes race weekends with official stored results. The counter shows
      scored events versus total predicted events.
    </div>

    <div class="profile-page-card">
      ${editing
        ? html`<div class="profile-editor">
            <div class="form-group">
              <label class="form-label">Display Name</label>
              <input
                class="form-input"
                type="text"
                value=${editData.display_name}
                maxlength="30"
                onInput=${(event) =>
                  setEditData((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))}
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                Bio
                <span style=${{ fontWeight: 400, opacity: 0.6 }}>
                  (${(editData.bio || '').length}/200)
                </span>
              </label>
              <textarea
                class="form-textarea"
                value=${editData.bio}
                maxlength="200"
                placeholder="Tell the group something about you."
                onInput=${(event) =>
                  setEditData((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))}
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Favorite Team</label>
              <select
                class="form-select"
                value=${editData.favorite_team}
                onChange=${(event) =>
                  setEditData((current) => ({
                    ...current,
                    favorite_team: event.target.value,
                  }))}
              >
                <option value="">Select a team...</option>
                ${TEAMS.map(
                  (team) => html`<option key=${team.id} value=${team.id}>
                    ${team.name}
                  </option>`,
                )}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Favorite Driver</label>
              <select
                class="form-select"
                value=${editData.favorite_driver}
                onChange=${(event) =>
                  setEditData((current) => ({
                    ...current,
                    favorite_driver: event.target.value,
                  }))}
              >
                <option value="">Select a driver...</option>
                ${DRIVERS.map((driver) => {
                  return html`<option key=${driver.id} value=${String(driver.id)}>
                    ${driver.name} - ${getTeam(driver.team).name}
                  </option>`;
                })}
              </select>
            </div>
            <div class="prediction-actions">
              <button class="btn btn-secondary" onClick=${() => setEditing(false)}>
                Cancel
              </button>
              <button class="btn btn-primary" onClick=${handleSave} disabled=${saving}>
                ${saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>`
        : html`<div>
            <div class="profile-header">
              <div class="profile-avatar" style=${{ backgroundColor: teamColor }}>
                ${(profileSummary.display_name || profileSummary.username || '?')[0].toUpperCase()}
              </div>
              <div class="profile-display-name">
                ${profileSummary.display_name || profileSummary.username}
              </div>
              <div class="profile-username">@${profileSummary.username}</div>
              ${profileSummary.bio && html`<div class="profile-bio">${profileSummary.bio}</div>`}
              ${profileSummary.created_at &&
              html`<div class="profile-member-since">
                Member since
                ${new Date(profileSummary.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </div>`}
            </div>

            <div class="accuracy-gauge">
              <div class="accuracy-circle" style=${{ borderColor: teamColor }}>
                <span class="accuracy-value">
                ${hasAccuracy ? `${accuracyValue}%` : '-'}
              </span>
            </div>
            <div class="accuracy-label">
                ${hasAccuracy
                  ? `Prediction accuracy across ${scoredEvents} scored event${scoredEvents === 1 ? '' : 's'}`
                  : 'No scored events yet'}
              </div>
            </div>

            <div class="profile-stats-grid">
              <div class="profile-stat">
                <div class="profile-stat-value">${racesRanked}</div>
                <div class="profile-stat-label">Events Picked</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-value">${totalCorrect ?? '-'}</div>
                <div class="profile-stat-label">Exact Matches</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-value">${positionDiff ?? '-'}</div>
                <div class="profile-stat-label">Avg Pos Diff</div>
              </div>
            </div>

            ${(favoriteTeam || favoriteDriver) &&
            html`<div class="profile-favorites">
              ${favoriteTeam &&
              html`<div class="profile-fav-item">
                <${TeamDot} teamId=${favoriteTeam.id} />
                <strong>${favoriteTeam.name}</strong>
              </div>`}
              ${favoriteDriver &&
              html`<div class="profile-fav-item">
                <${UserIcon} size=${14} />
                <strong>${favoriteDriver.name}</strong>
              </div>`}
            </div>`}

            ${isOwnProfile &&
            html`<button
              class="btn btn-secondary"
              style=${{ width: '100%' }}
              onClick=${() => setEditing(true)}
            >
              Edit Profile
            </button>`}
          </div>`}
    </div>
  </div>`;
}
