const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'netinfo.db');

// ── Open / create DB ──
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('DB open error:', err.message); process.exit(1); }
  console.log('📦  Database:', DB_PATH);
});

// Promisify helpers
const run  = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(err) { err ? rej(err) : res(this); }));
const get  = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row)));
const all  = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

// ── Enable foreign keys & WAL ──
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
});

// ── Schema ──
async function initSchema() {
  await run(`
    CREATE TABLE IF NOT EXISTS companies (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'NNI',
      asn         TEXT,
      contact     TEXT,
      description TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS links (
      id                TEXT PRIMARY KEY,
      company_id        TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'active',
      description       TEXT,
      interface_local   TEXT,
      interface_remote  TEXT,
      bandwidth         TEXT,
      circuit_id        TEXT,
      provider_ref      TEXT,
      vlan_id           TEXT,
      vlan_name         TEXT,
      encapsulation     TEXT,
      local_ip          TEXT,
      remote_ip         TEXT,
      subnet            TEXT,
      bgp_local_as      TEXT,
      bgp_peer_as       TEXT,
      bgp_peer_ip       TEXT,
      advertised_routes TEXT,
      received_routes   TEXT,
      notes             TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS customers (
      id         TEXT PRIMARY KEY,
      link_id    TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      vlan_id    TEXT,
      address    TEXT,
      point_a    TEXT,
      point_b    TEXT,
      optical_rx TEXT,
      optical_tx TEXT,
      circuit_id TEXT,
      notes      TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

// ── Company Queries ──
const getAllCompanies = () => all(`
  SELECT c.*,
    COUNT(l.id) as link_count,
    SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as active_links,
    SUM(CASE WHEN l.status = 'down'   THEN 1 ELSE 0 END) as down_links
  FROM companies c
  LEFT JOIN links l ON l.company_id = c.id
  GROUP BY c.id
  ORDER BY c.name ASC
`);

const getCompanyById = (id) => get('SELECT * FROM companies WHERE id = ?', [id]);

const createCompany = async (data) => {
  const now = new Date().toISOString();
  const id  = uuidv4();
  await run(
    `INSERT INTO companies (id, name, type, asn, contact, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.type || 'NNI', data.asn || null, data.contact || null, data.description || null, now, now]
  );
  return getCompanyById(id);
};

const updateCompany = async (id, data) => {
  const now = new Date().toISOString();
  await run(
    `UPDATE companies SET name=?, type=?, asn=?, contact=?, description=?, updated_at=? WHERE id=?`,
    [data.name, data.type, data.asn || null, data.contact || null, data.description || null, now, id]
  );
  return getCompanyById(id);
};

const deleteCompany = (id) => run('DELETE FROM companies WHERE id = ?', [id]);

// ── Link Queries ──
const getLinksByCompany = (companyId) => all('SELECT * FROM links WHERE company_id = ? ORDER BY name ASC', [companyId]);

const getLinkById = (id) => get('SELECT * FROM links WHERE id = ?', [id]);

const createLink = async (companyId, data) => {
  const now = new Date().toISOString();
  const id  = uuidv4();
  await run(`
    INSERT INTO links (
      id, company_id, name, status, description,
      interface_local, interface_remote, bandwidth, circuit_id, provider_ref,
      vlan_id, vlan_name, encapsulation,
      local_ip, remote_ip, subnet,
      bgp_local_as, bgp_peer_as, bgp_peer_ip, advertised_routes, received_routes,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, companyId, data.name, data.status || 'active', data.description || null,
      data.interface_local || null, data.interface_remote || null, data.bandwidth || null, data.circuit_id || null, data.provider_ref || null,
      data.vlan_id || null, data.vlan_name || null, data.encapsulation || null,
      data.local_ip || null, data.remote_ip || null, data.subnet || null,
      data.bgp_local_as || null, data.bgp_peer_as || null, data.bgp_peer_ip || null,
      data.advertised_routes || null, data.received_routes || null,
      data.notes || null, now, now
    ]
  );
  return getLinkById(id);
};

const updateLink = async (id, data) => {
  const now = new Date().toISOString();
  await run(`
    UPDATE links SET
      name=?, status=?, description=?,
      interface_local=?, interface_remote=?, bandwidth=?, circuit_id=?, provider_ref=?,
      vlan_id=?, vlan_name=?, encapsulation=?,
      local_ip=?, remote_ip=?, subnet=?,
      bgp_local_as=?, bgp_peer_as=?, bgp_peer_ip=?, advertised_routes=?, received_routes=?,
      notes=?, updated_at=?
    WHERE id=?`,
    [
      data.name, data.status, data.description || null,
      data.interface_local || null, data.interface_remote || null, data.bandwidth || null, data.circuit_id || null, data.provider_ref || null,
      data.vlan_id || null, data.vlan_name || null, data.encapsulation || null,
      data.local_ip || null, data.remote_ip || null, data.subnet || null,
      data.bgp_local_as || null, data.bgp_peer_as || null, data.bgp_peer_ip || null,
      data.advertised_routes || null, data.received_routes || null,
      data.notes || null, now, id
    ]
  );
  return getLinkById(id);
};

const deleteLink = (id) => run('DELETE FROM links WHERE id = ?', [id]);

// ── Customer Queries ──
const getCustomersByLink = (linkId) => all('SELECT * FROM customers WHERE link_id = ? ORDER BY name ASC', [linkId]);

const getCustomerById = (id) => get('SELECT * FROM customers WHERE id = ?', [id]);

const createCustomer = async (linkId, data) => {
  const now = new Date().toISOString();
  const id  = uuidv4();
  await run(`
    INSERT INTO customers (id, link_id, name, vlan_id, address, point_a, point_b, optical_rx, optical_tx, circuit_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, linkId, data.name, data.vlan_id || null, data.address || null,
     data.point_a || null, data.point_b || null,
     data.optical_rx || null, data.optical_tx || null,
     data.circuit_id || null, data.notes || null, now, now]
  );
  return getCustomerById(id);
};

const updateCustomer = async (id, data) => {
  const now = new Date().toISOString();
  await run(`
    UPDATE customers SET
      name=?, vlan_id=?, address=?, point_a=?, point_b=?,
      optical_rx=?, optical_tx=?, circuit_id=?, notes=?, updated_at=?
    WHERE id=?`,
    [data.name, data.vlan_id || null, data.address || null,
     data.point_a || null, data.point_b || null,
     data.optical_rx || null, data.optical_tx || null,
     data.circuit_id || null, data.notes || null, now, id]
  );
  return getCustomerById(id);
};

const deleteCustomer = (id) => run('DELETE FROM customers WHERE id = ?', [id]);

module.exports = {
  initSchema,
  getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany,
  getLinksByCompany, getLinkById, createLink, updateLink, deleteLink,
  getCustomersByLink, getCustomerById, createCustomer, updateCustomer, deleteCustomer
};
