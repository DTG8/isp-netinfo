/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ISP NetInfo — Frontend App
   Flow: Dashboard → Company → Link → Customers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ─────────────────────────────────────────
//  API helpers
// ─────────────────────────────────────────
const api = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  }
};

// ─────────────────────────────────────────
//  Toast notifications
// ─────────────────────────────────────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// ─────────────────────────────────────────
//  Confirm dialog
// ─────────────────────────────────────────
function confirmDialog(msg) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="confirm-box">
        <h3>Confirm Action</h3>
        <p>${msg}</p>
        <div class="confirm-box__actions">
          <button class="btn btn--ghost" id="confirm-cancel">Cancel</button>
          <button class="btn btn--danger" id="confirm-ok">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#confirm-cancel').onclick = () => { backdrop.remove(); resolve(false); };
    backdrop.querySelector('#confirm-ok').onclick    = () => { backdrop.remove(); resolve(true); };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } });
  });
}

// ─────────────────────────────────────────
//  Modal helpers
// ─────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  m.hidden = false;
  m.addEventListener('click', e => { if (e.target === m) closeModal(id); }, { once: true });
}
function closeModal(id) { document.getElementById(id).hidden = true; }

// ─────────────────────────────────────────
//  State
// ─────────────────────────────────────────
let state = {
  view: 'dashboard',   // 'dashboard' | 'company' | 'link'
  companyId:      null,
  linkId:         null,
  companies:      [],
  links:          [],
  customers:      [],
  currentCompany: null,
  currentLink:    null,
  searchQuery:    ''
};

// ─────────────────────────────────────────
//  Navigation
// ─────────────────────────────────────────
async function navigate(view, id = null) {
  state.view = view;
  if (view === 'dashboard') { state.companyId = null; state.linkId = null; }
  if (view === 'company')   { state.companyId = id;   state.linkId = null; }
  if (view === 'link')      { state.linkId = id; }
  state.searchQuery = '';
  const el = document.getElementById('global-search');
  if (el) el.value = '';
  await render();
}

// ─────────────────────────────────────────
//  Render router
// ─────────────────────────────────────────
async function render() {
  const root = document.getElementById('app-root');
  root.innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;

  try {
    if (state.view === 'dashboard') {
      state.companies = await api.get('/api/companies');
      renderDashboard(root);

    } else if (state.view === 'company') {
      state.currentCompany = await api.get(`/api/companies/${state.companyId}`);
      state.links = await api.get(`/api/companies/${state.companyId}/links`);
      renderCompany(root);

    } else if (state.view === 'link') {
      state.currentLink = await api.get(`/api/links/${state.linkId}`);
      if (!state.currentCompany || state.currentCompany.id !== state.currentLink.company_id) {
        state.currentCompany = await api.get(`/api/companies/${state.currentLink.company_id}`);
      }
      state.customers = await api.get(`/api/links/${state.linkId}/customers`);
      renderLinkCustomers(root);
    }

    updateBreadcrumb();
    bindSearch();
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚠</div><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

// ─────────────────────────────────────────
//  Breadcrumb
// ─────────────────────────────────────────
function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  const crumbs = [];
  crumbs.push(`<span class="crumb" onclick="navigate('dashboard')">Dashboard</span>`);

  if (state.view === 'company' && state.currentCompany) {
    crumbs.push(`<span class="sep">›</span>`);
    crumbs.push(`<span class="crumb crumb--current">${esc(state.currentCompany.name)}</span>`);
  }
  if (state.view === 'link' && state.currentCompany && state.currentLink) {
    crumbs.push(`<span class="sep">›</span>`);
    crumbs.push(`<span class="crumb" onclick="navigate('company','${state.currentCompany.id}')">${esc(state.currentCompany.name)}</span>`);
    crumbs.push(`<span class="sep">›</span>`);
    crumbs.push(`<span class="crumb crumb--current">${esc(state.currentLink.name)}</span>`);
  }

  bc.innerHTML = crumbs.join('');
}

// ─────────────────────────────────────────
//  Dashboard View
// ─────────────────────────────────────────
function renderDashboard(root) {
  const filtered = state.companies.filter(c =>
    !state.searchQuery ||
    c.name.toLowerCase().includes(state.searchQuery) ||
    (c.type || '').toLowerCase().includes(state.searchQuery) ||
    (c.asn || '').toLowerCase().includes(state.searchQuery)
  );

  const totalLinks  = state.companies.reduce((a, c) => a + (c.link_count   || 0), 0);
  const activeLinks = state.companies.reduce((a, c) => a + (c.active_links || 0), 0);
  const downLinks   = state.companies.reduce((a, c) => a + (c.down_links   || 0), 0);

  root.innerHTML = `
    <div class="page-header">
      <div class="page-header__left">
        <h1>Network Dashboard</h1>
        <p>ISP partner companies and NNI connections registry</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary" onclick="openAddCompanyModal()">+ Add Company</button>
      </div>
    </div>

    <div class="stat-bar">
      <div class="stat-card"><div class="stat-card__value">${state.companies.length}</div><div class="stat-card__label">Companies</div></div>
      <div class="stat-card"><div class="stat-card__value">${totalLinks}</div><div class="stat-card__label">Total Links</div></div>
      <div class="stat-card"><div class="stat-card__value green">${activeLinks}</div><div class="stat-card__label">Active Links</div></div>
      <div class="stat-card"><div class="stat-card__value red">${downLinks}</div><div class="stat-card__label">Down Links</div></div>
    </div>

    <div class="company-grid" id="company-grid">
      ${filtered.length === 0 ? renderEmptyState('🏢', state.searchQuery ? 'No results found' : 'No companies yet', state.searchQuery ? 'Try a different search term.' : 'Click "Add Company" to register your first NNI partner.') : filtered.map(renderCompanyCard).join('')}
    </div>`;
}

function renderCompanyCard(c) {
  return `
    <div class="company-card" onclick="navigate('company','${c.id}')">
      <div class="company-card__header">
        <div class="company-card__name">${esc(c.name)}</div>
        <span class="badge badge--${c.type.toLowerCase().replace(/\s+/g, '-')}">${esc(c.type)}</span>
      </div>
      ${c.asn ? `<div class="company-card__asn">${esc(c.asn)}</div>` : ''}
      <div class="company-card__desc">${esc(c.description || 'No description provided.')}</div>
      <div class="company-card__footer">
        <div class="company-card__link-stats">
          <div class="company-card__link-stat"><span class="dot dot--total"></span>${c.link_count || 0} links</div>
          ${c.active_links > 0 ? `<div class="company-card__link-stat"><span class="dot dot--active"></span>${c.active_links} up</div>` : ''}
          ${c.down_links > 0 ? `<div class="company-card__link-stat"><span class="dot dot--down"></span>${c.down_links} down</div>` : ''}
        </div>
        <div class="company-card__actions" onclick="event.stopPropagation()">
          <button class="btn btn--icon" title="Edit" onclick="openEditCompanyModal('${c.id}')">✎</button>
          <button class="btn btn--icon danger" title="Delete" onclick="deleteCompany('${c.id}','${esc(c.name)}')">🗑</button>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────
//  Company View
// ─────────────────────────────────────────
function renderCompany(root) {
  const c = state.currentCompany;
  const filtered = state.links.filter(l =>
    !state.searchQuery ||
    l.name.toLowerCase().includes(state.searchQuery) ||
    (l.status || '').toLowerCase().includes(state.searchQuery) ||
    (l.vlan_id || '').toLowerCase().includes(state.searchQuery) ||
    (l.local_ip || '').toLowerCase().includes(state.searchQuery) ||
    (l.circuit_id || '').toLowerCase().includes(state.searchQuery)
  );
  const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  root.innerHTML = `
    <div class="company-hero">
      <div class="company-hero__avatar">${initials}</div>
      <div class="company-hero__info">
        <div class="company-hero__name">${esc(c.name)} <span class="badge badge--${c.type.toLowerCase().replace(/\s+/g, '-')}">${esc(c.type)}</span></div>
        ${c.description ? `<div class="company-hero__meta">${esc(c.description)}</div>` : ''}
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.3rem;">
          ${c.asn     ? `<div class="company-hero__asn">ASN: ${esc(c.asn)}</div>` : ''}
          ${c.contact ? `<div class="company-hero__asn" style="color:var(--text-secondary)">✉ ${esc(c.contact)}</div>` : ''}
        </div>
      </div>
      <div class="company-hero__actions">
        <button class="btn btn--ghost" onclick="openEditCompanyModal('${c.id}')">✎ Edit</button>
      </div>
    </div>

    <div class="page-header">
      <div class="page-header__left">
        <h1>Links / Connections</h1>
        <p>${filtered.length} of ${state.links.length} connections shown — click a link to manage its customers</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary" onclick="openAddLinkModal('${c.id}')">+ Add Link</button>
      </div>
    </div>

    ${filtered.length === 0
      ? renderEmptyState('🔗', state.searchQuery ? 'No results found' : 'No links yet', state.searchQuery ? 'Try a different search term.' : 'Click "Add Link" to register a connection for this company.')
      : `<div class="links-table-wrap">
          <table class="links-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>VLAN</th>
                <th>Local IP</th>
                <th>Remote IP</th>
                <th>Bandwidth</th>
                <th>Circuit ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${filtered.map(renderLinkRow).join('')}</tbody>
          </table>
        </div>`}`;
}

function renderLinkRow(l) {
  return `
    <tr onclick="navigate('link','${l.id}')">
      <td>
        <div class="link-name">${esc(l.name)}</div>
        ${l.description ? `<div class="link-meta">${esc(l.description)}</div>` : ''}
      </td>
      <td>${statusPill(l.status)}</td>
      <td><span class="link-meta">${l.vlan_id ? `VLAN ${esc(l.vlan_id)}` : '—'}</span></td>
      <td><span class="link-meta">${esc(l.local_ip  || '—')}</span></td>
      <td><span class="link-meta">${esc(l.remote_ip || '—')}</span></td>
      <td><span class="link-meta">${esc(l.bandwidth || '—')}</span></td>
      <td><span class="link-meta">${esc(l.circuit_id || '—')}</span></td>
      <td onclick="event.stopPropagation()">
        <div class="table-actions">
          <button class="btn btn--icon" title="Edit Link" onclick="openEditLinkModal('${l.id}')">✎</button>
          <button class="btn btn--icon danger" title="Delete Link" onclick="deleteLinkHandler('${l.id}','${esc(l.name)}')">🗑</button>
        </div>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────
//  Link → Customers View  (NEW)
// ─────────────────────────────────────────
function renderLinkCustomers(root) {
  const l = state.currentLink;
  const filtered = state.customers.filter(c =>
    !state.searchQuery ||
    c.name.toLowerCase().includes(state.searchQuery) ||
    (c.vlan_id    || '').toLowerCase().includes(state.searchQuery) ||
    (c.address    || '').toLowerCase().includes(state.searchQuery) ||
    (c.circuit_id || '').toLowerCase().includes(state.searchQuery) ||
    (c.point_a    || '').toLowerCase().includes(state.searchQuery) ||
    (c.point_b    || '').toLowerCase().includes(state.searchQuery)
  );

  root.innerHTML = `
    <!-- Link summary banner -->
    <div class="link-banner">
      <div class="link-banner__left">
        <div class="link-banner__name">${esc(l.name)} ${statusPill(l.status)}</div>
        <div class="link-banner__meta">
          ${l.interface_local ? `<span class="link-banner__chip mono">🔌 ${esc(l.interface_local)}</span>` : ''}
          ${l.vlan_id         ? `<span class="link-banner__chip mono">VLAN ${esc(l.vlan_id)}</span>` : ''}
          ${l.local_ip        ? `<span class="link-banner__chip mono">${esc(l.local_ip)}</span>` : ''}
          ${l.remote_ip       ? `<span class="link-banner__chip mono">↔ ${esc(l.remote_ip)}</span>` : ''}
          ${l.bandwidth       ? `<span class="link-banner__chip">⚡ ${esc(l.bandwidth)}</span>` : ''}
          ${l.circuit_id      ? `<span class="link-banner__chip mono">🔖 ${esc(l.circuit_id)}</span>` : ''}
        </div>
      </div>
      <div class="link-banner__actions">
        <button class="btn btn--ghost btn--sm" onclick="openEditLinkModal('${l.id}')">✎ Edit Link</button>
        <button class="btn btn--danger btn--sm" onclick="deleteLinkHandler('${l.id}','${esc(l.name)}')">🗑</button>
      </div>
    </div>

    <!-- Customers -->
    <div class="page-header" style="margin-top:1.5rem">
      <div class="page-header__left">
        <h1>Customers on this Link</h1>
        <p>${filtered.length} of ${state.customers.length} customer${state.customers.length !== 1 ? 's' : ''} — click a row to view / edit</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary" onclick="openAddCustomerModal('${l.id}')">+ Add Customer</button>
      </div>
    </div>

    ${filtered.length === 0
      ? renderEmptyState('👥', state.searchQuery ? 'No results found' : 'No customers yet', state.searchQuery ? 'Try a different search term.' : 'Click "Add Customer" to register a customer on this link.')
      : `<div class="links-table-wrap">
          <table class="links-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>VLAN</th>
                <th>Point A</th>
                <th>Point B</th>
                <th>Optical RX</th>
                <th>Optical TX</th>
                <th>Circuit ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${filtered.map(renderCustomerRow).join('')}</tbody>
          </table>
        </div>`}`;
}

function renderCustomerRow(c) {
  return `
    <tr onclick="openEditCustomerModal('${c.id}')" title="Click to edit">
      <td>
        <div class="link-name">${esc(c.name)}</div>
        ${c.address ? `<div class="link-meta">📍 ${esc(c.address)}</div>` : ''}
      </td>
      <td><span class="link-meta">${c.vlan_id ? `VLAN ${esc(c.vlan_id)}` : '—'}</span></td>
      <td><span class="link-meta">${esc(c.point_a || '—')}</span></td>
      <td><span class="link-meta">${esc(c.point_b || '—')}</span></td>
      <td><span class="link-meta optical">${c.optical_rx ? `${esc(c.optical_rx)}` : '—'}</span></td>
      <td><span class="link-meta optical">${c.optical_tx ? `${esc(c.optical_tx)}` : '—'}</span></td>
      <td><span class="link-meta mono">${esc(c.circuit_id || '—')}</span></td>
      <td onclick="event.stopPropagation()">
        <div class="table-actions">
          <button class="btn btn--icon" title="Edit" onclick="openEditCustomerModal('${c.id}')">✎</button>
          <button class="btn btn--icon danger" title="Delete" onclick="deleteCustomerHandler('${c.id}','${esc(c.name)}')">🗑</button>
        </div>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────
//  Shared empty state
// ─────────────────────────────────────────
function renderEmptyState(icon, title, desc) {
  return `<div class="empty-state">
    <div class="empty-state__icon">${icon}</div>
    <h3>${title}</h3>
    <p>${desc}</p>
  </div>`;
}

// ─────────────────────────────────────────
//  Status pill
// ─────────────────────────────────────────
function statusPill(status) {
  const label = { active: 'Active', down: 'Down', maintenance: 'Maintenance', decommissioned: 'Decommissioned' }[status] || status;
  return `<span class="status-pill status-pill--${status}">${label}</span>`;
}

// ─────────────────────────────────────────
//  Escape HTML
// ─────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────
//  Company Modal
// ─────────────────────────────────────────
function openAddCompanyModal() {
  document.getElementById('company-modal-title').textContent = 'Add Company';
  document.getElementById('company-submit-btn').textContent  = 'Add Company';
  document.getElementById('company-form').reset();
  document.getElementById('company-id').value = '';
  openModal('company-modal');
}

async function openEditCompanyModal(id) {
  let company;
  try { company = await api.get(`/api/companies/${id}`); }
  catch(e) { toast('Failed to load company', 'error'); return; }
  document.getElementById('company-modal-title').textContent = 'Edit Company';
  document.getElementById('company-submit-btn').textContent  = 'Save Changes';
  document.getElementById('company-id').value          = company.id;
  document.getElementById('company-name').value        = company.name        || '';
  document.getElementById('company-type').value        = company.type        || 'NNI';
  document.getElementById('company-asn').value         = company.asn         || '';
  document.getElementById('company-contact').value     = company.contact     || '';
  document.getElementById('company-description').value = company.description || '';
  openModal('company-modal');
}

async function submitCompanyForm(e) {
  e.preventDefault();
  const id = document.getElementById('company-id').value;
  const payload = {
    name:        document.getElementById('company-name').value.trim(),
    type:        document.getElementById('company-type').value,
    asn:         document.getElementById('company-asn').value.trim(),
    contact:     document.getElementById('company-contact').value.trim(),
    description: document.getElementById('company-description').value.trim()
  };
  try {
    if (id) { await api.put(`/api/companies/${id}`, payload); toast('Company updated', 'success'); }
    else    { await api.post('/api/companies', payload);      toast('Company added', 'success'); }
    closeModal('company-modal');
    await navigate(state.view, state.companyId);
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteCompany(id, name) {
  const ok = await confirmDialog(`Delete "${name}" and all its links? This cannot be undone.`);
  if (!ok) return;
  try { await api.del(`/api/companies/${id}`); toast('Company deleted', 'success'); navigate('dashboard'); }
  catch(err) { toast(err.message, 'error'); }
}

// ─────────────────────────────────────────
//  Link Modal
// ─────────────────────────────────────────
function openAddLinkModal(companyId) {
  document.getElementById('link-modal-title').textContent = 'Add Link';
  document.getElementById('link-submit-btn').textContent  = 'Add Link';
  document.getElementById('link-form').reset();
  document.getElementById('link-id').value         = '';
  document.getElementById('link-company-id').value = companyId;
  openModal('link-modal');
}

async function openEditLinkModal(linkId) {
  let link;
  try { link = await api.get(`/api/links/${linkId}`); }
  catch(e) { toast('Failed to load link', 'error'); return; }
  document.getElementById('link-modal-title').textContent = 'Edit Link';
  document.getElementById('link-submit-btn').textContent  = 'Save Changes';
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('link-id', link.id);
  set('link-company-id', link.company_id);
  set('link-name', link.name);
  set('link-status', link.status);
  set('link-description', link.description);
  set('link-interface-local', link.interface_local);
  set('link-interface-remote', link.interface_remote);
  set('link-bandwidth', link.bandwidth);
  set('link-circuit-id', link.circuit_id);
  set('link-provider-ref', link.provider_ref);
  set('link-vlan-id', link.vlan_id);
  set('link-vlan-name', link.vlan_name);
  set('link-encapsulation', link.encapsulation);
  set('link-local-ip', link.local_ip);
  set('link-remote-ip', link.remote_ip);
  set('link-subnet', link.subnet);
  set('link-bgp-local-as', link.bgp_local_as);
  set('link-bgp-peer-as', link.bgp_peer_as);
  set('link-bgp-peer-ip', link.bgp_peer_ip);
  set('link-advertised-routes', link.advertised_routes);
  set('link-received-routes', link.received_routes);
  set('link-notes', link.notes);
  openModal('link-modal');
}

async function submitLinkForm(e) {
  e.preventDefault();
  const id        = document.getElementById('link-id').value;
  const companyId = document.getElementById('link-company-id').value;
  const payload = {
    name: document.getElementById('link-name').value.trim(),
    status: document.getElementById('link-status').value,
    description: document.getElementById('link-description').value.trim(),
    interface_local: document.getElementById('link-interface-local').value.trim(),
    interface_remote: document.getElementById('link-interface-remote').value.trim(),
    bandwidth: document.getElementById('link-bandwidth').value.trim(),
    circuit_id: document.getElementById('link-circuit-id').value.trim(),
    provider_ref: document.getElementById('link-provider-ref').value.trim(),
    vlan_id: document.getElementById('link-vlan-id').value.trim(),
    vlan_name: document.getElementById('link-vlan-name').value.trim(),
    encapsulation: document.getElementById('link-encapsulation').value,
    local_ip: document.getElementById('link-local-ip').value.trim(),
    remote_ip: document.getElementById('link-remote-ip').value.trim(),
    subnet: document.getElementById('link-subnet').value.trim(),
    bgp_local_as: document.getElementById('link-bgp-local-as').value.trim(),
    bgp_peer_as: document.getElementById('link-bgp-peer-as').value.trim(),
    bgp_peer_ip: document.getElementById('link-bgp-peer-ip').value.trim(),
    advertised_routes: document.getElementById('link-advertised-routes').value.trim(),
    received_routes: document.getElementById('link-received-routes').value.trim(),
    notes: document.getElementById('link-notes').value.trim()
  };
  try {
    if (id) {
      await api.put(`/api/links/${id}`, payload);
      toast('Link updated', 'success');
      closeModal('link-modal');
      // Refresh current view
      if (state.view === 'link') await navigate('link', id);
      else await navigate('company', companyId);
    } else {
      await api.post(`/api/companies/${companyId}/links`, payload);
      toast('Link added', 'success');
      closeModal('link-modal');
      await navigate('company', companyId);
    }
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteLinkHandler(id, name) {
  const ok = await confirmDialog(`Delete link "${name}" and all its customers? This cannot be undone.`);
  if (!ok) return;
  try {
    const companyId = state.currentCompany?.id || state.currentLink?.company_id;
    await api.del(`/api/links/${id}`);
    toast('Link deleted', 'success');
    navigate('company', companyId);
  } catch(err) { toast(err.message, 'error'); }
}

// ─────────────────────────────────────────
//  Customer Modal  (NEW)
// ─────────────────────────────────────────
function openAddCustomerModal(linkId) {
  document.getElementById('customer-modal-title').textContent = 'Add Customer';
  document.getElementById('customer-submit-btn').textContent  = 'Add Customer';
  document.getElementById('customer-form').reset();
  document.getElementById('customer-id').value      = '';
  document.getElementById('customer-link-id').value = linkId;
  openModal('customer-modal');
}

async function openEditCustomerModal(customerId) {
  let customer;
  try { customer = await api.get(`/api/customers/${customerId}`); }
  catch(e) { toast('Failed to load customer', 'error'); return; }
  document.getElementById('customer-modal-title').textContent = 'Edit Customer';
  document.getElementById('customer-submit-btn').textContent  = 'Save Changes';
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('customer-id',         customer.id);
  set('customer-link-id',    customer.link_id);
  set('customer-name',       customer.name);
  set('customer-vlan-id',    customer.vlan_id);
  set('customer-address',    customer.address);
  set('customer-point-a',    customer.point_a);
  set('customer-point-b',    customer.point_b);
  set('customer-optical-rx', customer.optical_rx);
  set('customer-optical-tx', customer.optical_tx);
  set('customer-circuit-id', customer.circuit_id);
  set('customer-notes',      customer.notes);
  openModal('customer-modal');
}

async function submitCustomerForm(e) {
  e.preventDefault();
  const id     = document.getElementById('customer-id').value;
  const linkId = document.getElementById('customer-link-id').value;
  const payload = {
    name:       document.getElementById('customer-name').value.trim(),
    vlan_id:    document.getElementById('customer-vlan-id').value.trim(),
    address:    document.getElementById('customer-address').value.trim(),
    point_a:    document.getElementById('customer-point-a').value.trim(),
    point_b:    document.getElementById('customer-point-b').value.trim(),
    optical_rx: document.getElementById('customer-optical-rx').value.trim(),
    optical_tx: document.getElementById('customer-optical-tx').value.trim(),
    circuit_id: document.getElementById('customer-circuit-id').value.trim(),
    notes:      document.getElementById('customer-notes').value.trim()
  };
  try {
    if (id) {
      await api.put(`/api/customers/${id}`, payload);
      toast('Customer updated', 'success');
    } else {
      await api.post(`/api/links/${linkId}/customers`, payload);
      toast('Customer added', 'success');
    }
    closeModal('customer-modal');
    // Refresh the customer list in place
    state.customers = await api.get(`/api/links/${state.currentLink.id}/customers`);
    const root = document.getElementById('app-root');
    renderLinkCustomers(root);
    bindSearch();
    updateBreadcrumb();
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteCustomerHandler(id, name) {
  const ok = await confirmDialog(`Delete customer "${name}"? This cannot be undone.`);
  if (!ok) return;
  try {
    await api.del(`/api/customers/${id}`);
    toast('Customer deleted', 'success');
    state.customers = await api.get(`/api/links/${state.currentLink.id}/customers`);
    const root = document.getElementById('app-root');
    renderLinkCustomers(root);
    bindSearch();
    updateBreadcrumb();
  } catch(err) { toast(err.message, 'error'); }
}

// ─────────────────────────────────────────
//  Search
// ─────────────────────────────────────────
function bindSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.value = state.searchQuery;
  input.oninput = (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    const root = document.getElementById('app-root');
    if (state.view === 'dashboard') { renderDashboard(root); bindSearch(); }
    else if (state.view === 'company') { renderCompany(root); bindSearch(); }
    else if (state.view === 'link')    { renderLinkCustomers(root); bindSearch(); }
  };
}

// ─────────────────────────────────────────
//  Keyboard shortcuts
// ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['company-modal','link-modal','customer-modal'].forEach(id => {
      const m = document.getElementById(id);
      if (m && !m.hidden) closeModal(id);
    });
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('global-search')?.focus();
  }
});

// ─────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────
navigate('dashboard');
