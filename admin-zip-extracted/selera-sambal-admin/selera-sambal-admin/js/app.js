/* Selera Sambal Admin: application controller (frontend-only). */
(function () {
  'use strict';

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const page = document.body.dataset.page;
  const labels = {
    dashboard: ['Dashboard', 'Overview'], products: ['Menu', 'Kelola hidangan'],
    categories: ['Kategori', 'Kelompokkan menu'], orders: ['Pesanan', 'Pantau pesanan masuk'],
    customers: ['Pelanggan', 'Riwayat pelanggan'], analytics: ['Analitik', 'Ringkasan bisnis'],
    promotions: ['Promo', 'Penawaran restoran'], inventory: ['Inventori', 'Ketersediaan menu'],
    reviews: ['Ulasan', 'Suara pelanggan'], notifications: ['Notifikasi', 'Pusat pemberitahuan'],
    settings: ['Pengaturan', 'Restoran dan sistem']
  };

  function rupiah(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function date(value) {
    return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  }

  function safe(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function empty(title, text, button = '') {
    return `<div class="empty"><span class="empty-icon">◌</span><b>${safe(title)}</b><span>${safe(text)}</span>${button}</div>`;
  }

  function toast(message) {
    let area = $('.toast-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'toast-area';
      document.body.append(area);
    }
    const item = document.createElement('div');
    item.className = 'toast success';
    item.textContent = message;
    area.append(item);
    setTimeout(() => item.remove(), 3000);
  }

  function notice(message) {
    toast(message);
    StorageManager.set('notifications', [...StorageManager.get('notifications'), {
      id: StorageManager.id('NOT'), text: message, read: false, createdAt: new Date().toISOString()
    }]);
  }

  function badge(status) {
    const statusClass = /tersedia|aktif|aman|selesai|dibaca/i.test(status) ? 'green' : /baru|diproses|siap|menipis/i.test(status) ? 'orange' : /habis|nonaktif|dibatalkan/i.test(status) ? 'red' : 'gray';
    return `<span class="badge ${statusClass}">${safe(status)}</span>`;
  }

  function modal(title, content) {
    const layer = document.createElement('div');
    layer.className = 'modal-layer';
    layer.innerHTML = `<section class="modal" role="dialog" aria-modal="true"><header class="modal-head"><h2>${safe(title)}</h2><button class="icon-button close" type="button" aria-label="Tutup">×</button></header>${content}</section>`;
    const close = () => layer.remove();
    $('.close', layer).onclick = close;
    layer.onclick = (event) => { if (event.target === layer) close(); };
    document.body.append(layer);
    return layer;
  }

  function confirmDelete(message, callback) {
    const dialog = modal('Konfirmasi', `<p class="muted">${safe(message)}</p><div class="form-actions"><button class="btn secondary cancel" type="button">Batal</button><button class="btn danger confirm" type="button">Hapus</button></div>`);
    $('.cancel', dialog).onclick = () => dialog.remove();
    $('.confirm', dialog).onclick = () => { callback(); dialog.remove(); };
  }

  function shell() {
    const admin = StorageManager.get('admin');
    const unread = StorageManager.get('notifications').filter((item) => !item.read).length;
    const links = [
      ['dashboard', '▦', 'Dashboard', 'UTAMA'], ['products', '▣', 'Menu', 'MANAJEMEN'],
      ['categories', '◫', 'Kategori', 'MANAJEMEN'], ['orders', '◉', 'Pesanan', 'MANAJEMEN'],
      ['customers', '♙', 'Pelanggan', 'MANAJEMEN'], ['analytics', '⌁', 'Analitik', 'BISNIS'],
      ['promotions', '✦', 'Promo', 'BISNIS'], ['inventory', '▤', 'Inventori', 'BISNIS'],
      ['reviews', '☆', 'Ulasan', 'ENGAGEMENT'], ['notifications', '◌', 'Notifikasi', 'ENGAGEMENT'],
      ['settings', '⚙', 'Pengaturan', 'SISTEM']
    ];
    let group = '';
    const navigation = links.map(([key, icon, text, currentGroup]) => {
      const heading = group !== currentGroup ? `<p class="nav-label">${currentGroup}</p>` : '';
      group = currentGroup;
      return `${heading}<a class="nav-link ${key === page ? 'active' : ''}" href="${key}.html"><span class="nav-icon">${icon}</span><span>${text}${key === 'notifications' && unread ? ` (${unread})` : ''}</span></a>`;
    }).join('');
    document.body.innerHTML = `<div class="app"><aside class="sidebar"><a class="logo" href="dashboard.html"><b>SS</b><span>Selera Sambal</span></a>${navigation}<div class="side-bottom"><a class="nav-link" href="settings.html"><span class="nav-icon">●</span><span>${safe(admin.name || 'Admin')}</span></a><button class="nav-link" id="logout" type="button"><span class="nav-icon">↪</span><span>Keluar</span></button></div></aside><main class="main"><header class="topbar"><button class="icon-button menu-toggle" type="button">☰</button><div class="crumb"><b>${labels[page][0]}</b> / ${labels[page][1]}</div><div class="top-actions"><input class="global-search" placeholder="Cari menu, order, pelanggan"><button class="icon-button" id="goNotifications" type="button">◌</button><span class="avatar">${safe((admin.name || 'A')[0])}</span><button class="btn primary" id="quickAdd" type="button">＋ Tambah</button></div></header><section class="page" id="page"></section></main></div>`;
    $('.menu-toggle').onclick = (e) => {
      e.stopPropagation();
      if (window.innerWidth <= 700) {
        $('.sidebar').classList.toggle('open');
      } else {
        $('.app').classList.toggle('sidebar-collapsed');
      }
    };
    document.addEventListener('click', (e) => {
      const sidebar = $('.sidebar');
      if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
    $('#logout').onclick = () => { sessionStorage.removeItem('ss_session'); localStorage.removeItem('ss_remember'); location.href = 'index.html'; };
    $('#goNotifications').onclick = () => { location.href = 'notifications.html'; };
    $('#quickAdd').onclick = quickAdd;
  }

  function heading(title, description, action = '') {
    return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
  }

  function productForm(productId = '') {
    const products = StorageManager.get('products');
    const categories = StorageManager.get('categories');
    const current = products.find((product) => product.id === productId) || {};
    const dialog = modal(productId ? 'Edit Menu' : 'Tambah Menu', `<form id="productForm"><div class="form-grid"><label>Nama Menu<input name="name" required value="${safe(current.name || '')}"></label><label>Kategori<select name="category"><option value="">Pilih kategori</option>${categories.map((category) => `<option ${current.category === category.name ? 'selected' : ''}>${safe(category.name)}</option>`).join('')}</select></label><label>Harga<input name="price" type="number" min="0" required value="${current.price ?? ''}"></label><label>Stok<input name="stock" type="number" min="0" required value="${current.stock ?? ''}"></label><label>Status<select name="status">${['Tersedia', 'Habis', 'Nonaktif'].map((status) => `<option ${current.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label>Label<select name="label"><option value="">Tanpa label</option>${['Best Seller', 'Baru', 'Pedas', 'Favorit', 'Promo'].map((label) => `<option ${current.label === label ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="full">Foto Menu (URL)<input name="image" value="${safe(current.image || '')}"></label><label class="full">Deskripsi<textarea name="description">${safe(current.description || '')}</textarea></label></div><div class="form-actions"><button class="btn secondary cancel" type="button">Batal</button><button class="btn primary">Simpan Menu</button></div></form>`);
    $('.cancel', dialog).onclick = () => dialog.remove();
    $('#productForm', dialog).onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const product = { ...current, ...values, id: current.id || StorageManager.id('MENU'), price: Number(values.price), stock: Number(values.stock), createdAt: current.createdAt || new Date().toISOString() };
      StorageManager.set('products', current.id ? products.map((item) => item.id === current.id ? product : item) : [...products, product]);
      dialog.remove(); notice(current.id ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan'); render();
    };
  }

  function renderProducts() {
    const products = StorageManager.get('products');
    const categories = StorageManager.get('categories');
    $('#page').innerHTML = `${heading('Menu', 'Kelola setiap menu yang tersedia.', '<button class="btn primary add-product" type="button">＋ Tambah Menu</button>')}<div class="toolbar"><input id="searchProduct" placeholder="Cari nama menu"><select id="filterCategory"><option value="">Semua kategori</option>${categories.map((item) => `<option>${safe(item.name)}</option>`).join('')}</select><select id="filterStatus"><option value="">Semua status</option><option>Tersedia</option><option>Habis</option><option>Nonaktif</option></select></div><div id="productList"></div>`;
    function list() {
      const keyword = $('#searchProduct').value.toLowerCase(); const category = $('#filterCategory').value; const status = $('#filterStatus').value;
      const shown = products.filter((item) => item.name.toLowerCase().includes(keyword) && (!category || item.category === category) && (!status || item.status === status));
      $('#productList').innerHTML = shown.length ? `<div class="product-grid">${shown.map((item) => `<article class="product-card"><div class="product-img">${item.image ? `<img src="${safe(item.image)}" alt="${safe(item.name)}">` : '♨'}</div>${item.label ? `<span class="badge orange card-label">${safe(item.label)}</span>` : ''}<div class="product-body"><h3>${safe(item.name)}</h3><p>${safe(item.category || 'Tanpa kategori')} · Stok ${item.stock}</p><div class="product-foot"><b>${rupiah(item.price)}</b>${badge(item.status)}<span class="row-actions"><button class="small-btn edit-product" data-id="${item.id}">Edit</button><button class="small-btn duplicate-product" data-id="${item.id}">Salin</button><button class="small-btn delete-product" data-id="${item.id}">Hapus</button></span></div></div></article>`).join('')}</div>` : empty('Belum ada menu', 'Tambahkan menu pertama untuk mulai mengelola menu Selera Sambal.', '<button class="btn primary add-product" type="button">＋ Tambah Menu</button>');
      $$('.add-product').forEach((button) => button.onclick = () => productForm());
      $$('.edit-product').forEach((button) => button.onclick = () => productForm(button.dataset.id));
      $$('.duplicate-product').forEach((button) => button.onclick = () => { const source = products.find((item) => item.id === button.dataset.id); StorageManager.set('products', [...products, { ...source, id: StorageManager.id('MENU'), name: `${source.name} (salinan)` }]); notice('Menu berhasil diduplikasi'); render(); });
      $$('.delete-product').forEach((button) => button.onclick = () => confirmDelete('Hapus menu ini?', () => { StorageManager.set('products', products.filter((item) => item.id !== button.dataset.id)); notice('Menu berhasil dihapus'); render(); }));
    }
    ['searchProduct', 'filterCategory', 'filterStatus'].forEach((id) => $(`#${id}`).oninput = list); list();
  }

  function simpleForm(type, id = '') {
    const entries = StorageManager.get(type); const current = entries.find((entry) => entry.id === id) || {};
    const fields = type === 'categories' ? `<label>Nama Kategori<input name="name" required value="${safe(current.name || '')}"></label><label>Deskripsi<input name="description" value="${safe(current.description || '')}"></label>` : type === 'promotions' ? `<label>Nama Promo<input name="name" required value="${safe(current.name || '')}"></label><label>Kode Promo<input name="code" required value="${safe(current.code || '')}"></label><label>Jenis Diskon<select name="kind"><option>Persentase</option><option>Nominal</option></select></label><label>Nilai Diskon<input name="value" type="number" value="${current.value ?? ''}"></label><label>Minimum Pembelian<input name="minimum" type="number" value="${current.minimum ?? ''}"></label><label>Status<select name="status"><option>Aktif</option><option>Nonaktif</option></select></label>` : `<label>Pelanggan<input name="customer" required value="${safe(current.customer || '')}"></label><label>Menu<input name="menu" value="${safe(current.menu || '')}"></label><label>Rating<select name="rating">${[1,2,3,4,5].map((rating) => `<option ${Number(current.rating) === rating ? 'selected' : ''}>${rating}</option>`).join('')}</select></label><label>Status<select name="status"><option>Belum dibaca</option><option>Dibaca</option></select></label><label class="full">Komentar<textarea name="comment">${safe(current.comment || '')}</textarea></label>`;
    const dialog = modal(id ? 'Edit Data' : 'Tambah Data', `<form id="simpleForm"><div class="form-grid">${fields}</div><div class="form-actions"><button class="btn secondary cancel" type="button">Batal</button><button class="btn primary">Simpan</button></div></form>`);
    $('.cancel', dialog).onclick = () => dialog.remove();
    $('#simpleForm', dialog).onsubmit = (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const entry = { ...current, ...values, id: current.id || StorageManager.id(type.toUpperCase()), createdAt: current.createdAt || new Date().toISOString() }; ['value','minimum','rating'].forEach((key) => { if (key in entry) entry[key] = Number(entry[key]); }); StorageManager.set(type, current.id ? entries.map((item) => item.id === current.id ? entry : item) : [...entries, entry]); dialog.remove(); notice('Data berhasil disimpan'); render(); };
  }

  function table(items, headers, row, title, description) {
    return items.length ? `<section class="panel table-wrap"><table class="data-table"><thead><tr>${headers.map((item) => `<th>${item}</th>`).join('')}</tr></thead><tbody>${items.map((item) => `<tr>${row(item)}</tr>`).join('')}</tbody></table></section>` : empty(title, description);
  }

  function actions(type, id) {
    return `<td><button class="small-btn edit-simple" data-id="${id}">Edit</button><button class="small-btn delete-simple" data-id="${id}">Hapus</button></td>`;
  }

  function bindSimple(type) {
    $$('.edit-simple').forEach((button) => button.onclick = () => simpleForm(type, button.dataset.id));
    $$('.delete-simple').forEach((button) => button.onclick = () => confirmDelete('Hapus data ini?', () => { StorageManager.set(type, StorageManager.get(type).filter((item) => item.id !== button.dataset.id)); notice('Data berhasil dihapus'); render(); }));
  }

  function renderCategories() {
    const categories = StorageManager.get('categories'); const products = StorageManager.get('products');
    $('#page').innerHTML = heading('Kategori', 'Kelompokkan menu agar mudah dicari.', '<button class="btn primary add" type="button">＋ Tambah Kategori</button>') + table(categories, ['Kategori','Deskripsi','Jumlah Menu','Aksi'], (item) => `<td><b>${safe(item.name)}</b></td><td>${safe(item.description || '—')}</td><td>${products.filter((product) => product.category === item.name).length} menu</td>${actions('categories', item.id)}`, 'Belum ada kategori', 'Buat kategori pertama untuk menata menu Anda.');
    $('.add')?.addEventListener('click', () => simpleForm('categories')); bindSimple('categories');
  }

  function orderForm() {
    const products = StorageManager.get('products').filter((item) => item.status === 'Tersedia');
    if (!products.length) { toast('Tambahkan menu tersedia terlebih dahulu.'); location.href = 'products.html'; return; }
    const dialog = modal('Tambah Pesanan', `<form id="orderForm"><div class="form-grid"><label>Nama Pelanggan<input name="customer" required></label><label>Nomor Kontak<input name="phone"></label><label>Menu<select name="productId">${products.map((item) => `<option value="${item.id}">${safe(item.name)} — ${rupiah(item.price)}</option>`).join('')}</select></label><label>Jumlah<input name="qty" type="number" min="1" value="1"></label><label>Pembayaran<select name="payment"><option>Tunai</option><option>QRIS</option><option>Transfer</option></select></label><label>Status<select name="status"><option>Baru</option><option>Diproses</option><option>Siap</option><option>Selesai</option><option>Dibatalkan</option></select></label></div><div class="form-actions"><button class="btn secondary cancel" type="button">Batal</button><button class="btn primary">Simpan Pesanan</button></div></form>`);
    $('.cancel', dialog).onclick = () => dialog.remove();
    $('#orderForm', dialog).onsubmit = (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const product = products.find((item) => item.id === values.productId); const item = { productId: product.id, name: product.name, price: Number(product.price), qty: Number(values.qty) }; const order = { id: `${StorageManager.get('settings').orderPrefix || 'SS'}-${String(Date.now()).slice(-6)}`, customer: values.customer, phone: values.phone, items: [item], total: item.price * item.qty, payment: values.payment, status: values.status, createdAt: new Date().toISOString() }; StorageManager.set('orders', [...StorageManager.get('orders'), order]); const customers = StorageManager.get('customers'); if (!customers.some((customer) => customer.name === values.customer)) StorageManager.set('customers', [...customers, { id: StorageManager.id('CUST'), name: values.customer, phone: values.phone, createdAt: order.createdAt }]); dialog.remove(); notice('Pesanan berhasil disimpan'); render(); };
  }

  function orderRows(orders, action = true) {
    return table(orders, ['Order ID','Pelanggan','Item','Total','Status','Waktu', ...(action ? ['Aksi'] : [])], (order) => `<td><b>${safe(order.id)}</b></td><td>${safe(order.customer)}</td><td>${order.items.map((item) => `${safe(item.name)} ×${item.qty}`).join(', ')}</td><td>${rupiah(order.total)}</td><td>${badge(order.status)}</td><td>${date(order.createdAt)}</td>${action ? `<td><button class="small-btn detail-order" data-id="${order.id}">Detail</button></td>` : ''}`, 'Belum ada pesanan', 'Pesanan yang masuk akan muncul di sini.');
  }

  function renderOrders() {
    const orders = StorageManager.get('orders');
    $('#page').innerHTML = `${heading('Pesanan','Pantau pesanan yang masuk.','<button class="btn primary add-order" type="button">＋ Tambah Pesanan</button>')}<div class="toolbar"><input id="searchOrder" placeholder="Cari ID atau pelanggan"><select id="orderStatus"><option value="">Semua status</option>${['Baru','Diproses','Siap','Selesai','Dibatalkan'].map((status) => `<option>${status}</option>`).join('')}</select></div><div id="orderList"></div>`;
    function list() { const keyword = $('#searchOrder').value.toLowerCase(); const status = $('#orderStatus').value; const shown = orders.filter((item) => `${item.id}${item.customer}`.toLowerCase().includes(keyword) && (!status || item.status === status)); $('#orderList').innerHTML = orderRows(shown); $$('.detail-order').forEach((button) => button.onclick = () => orderDetail(button.dataset.id)); }
    $('.add-order').onclick = orderForm; $('#searchOrder').oninput = list; $('#orderStatus').oninput = list; list();
  }

  function orderDetail(id) {
    const order = StorageManager.get('orders').find((item) => item.id === id);
    const dialog = modal(`Order ${order.id}`, `<div class="invoice"><h2>SELERA SAMBAL</h2><p class="muted">${date(order.createdAt)} · ${safe(order.customer)}</p><hr>${order.items.map((item) => `<div class="line"><span>${safe(item.name)} × ${item.qty}</span><b>${rupiah(item.price * item.qty)}</b></div>`).join('')}<hr><div class="line"><b>Total</b><b>${rupiah(order.total)}</b></div><label>Status Pesanan<select id="detailStatus">${['Baru','Diproses','Siap','Selesai','Dibatalkan'].map((status) => `<option ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label></div><div class="form-actions"><button class="btn danger delete" type="button">Hapus</button><button class="btn secondary print" type="button">Cetak Invoice</button><button class="btn primary save" type="button">Simpan Status</button></div>`);
    $('.save', dialog).onclick = () => { StorageManager.set('orders', StorageManager.get('orders').map((item) => item.id === id ? { ...item, status: $('#detailStatus', dialog).value } : item)); dialog.remove(); notice('Status pesanan diperbarui'); render(); };
    $('.delete', dialog).onclick = () => confirmDelete('Hapus pesanan ini?', () => { StorageManager.set('orders', StorageManager.get('orders').filter((item) => item.id !== id)); dialog.remove(); notice('Pesanan berhasil dihapus'); render(); }); $('.print', dialog).onclick = () => print();
  }

  function renderDashboard() {
    const products = StorageManager.get('products'); const orders = StorageManager.get('orders'); const reviews = StorageManager.get('reviews'); const threshold = Number(StorageManager.get('settings').stockThreshold); const active = orders.filter((item) => item.status !== 'Dibatalkan'); const revenue = active.reduce((sum, item) => sum + Number(item.total), 0); const sold = active.reduce((sum, order) => sum + order.items.reduce((count, item) => count + Number(item.qty), 0), 0); const warning = products.filter((item) => Number(item.stock) <= threshold);
    $('#page').innerHTML = `${heading('Selamat datang, Admin','Berikut ringkasan operasional Selera Sambal hari ini.','<button class="btn primary add-product" type="button">＋ Tambah Menu</button>')}<div class="cards"><article class="stat-card"><span class="stat-icon">▣</span><p>Total Menu</p><strong>${products.length}</strong></article><article class="stat-card"><span class="stat-icon">◉</span><p>Menu Terjual</p><strong>${sold}</strong></article><article class="stat-card"><span class="stat-icon">Rp</span><p>Pendapatan</p><strong>${rupiah(revenue)}</strong></article><article class="stat-card"><span class="stat-icon">▤</span><p>Pesanan</p><strong>${orders.length}</strong></article></div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>Penjualan</h2><span class="muted">7 Hari</span></div><div class="chart-area">${orders.length ? '<div class="chart-empty">Grafik memperbarui dari data pesanan.</div>' : '<div class="chart-empty">Belum ada data penjualan</div>'}</div></section><section class="panel"><div class="panel-head"><h2>Peringatan Stok</h2></div><div class="mini-list">${warning.length ? warning.map((item) => `<div class="warning-item"><span class="warning-dot">!</span><div><b>${safe(item.name)}</b><br><small class="muted">${item.stock ? `Stok tersisa ${item.stock}` : 'Stok habis'}</small></div>${badge(item.stock ? 'Menipis' : 'Habis')}</div>`).join('') : empty('Tidak ada peringatan stok.','Semua stok dalam kondisi aman.')}</div></section></div><section class="panel full-panel"><div class="panel-head"><h2>Pesanan Terbaru</h2></div>${orders.length ? orderRows([...orders].reverse().slice(0, 5), false) : empty('Belum ada aktivitas','Pesanan yang masuk akan tampil di sini.','<button class="btn primary add-order" type="button">＋ Tambah Pesanan</button>')}</section><section class="panel full-panel"><div class="panel-head"><h2>Rating Restoran</h2></div>${reviews.length ? `<strong style="font-size:30px">${(reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length).toFixed(1)} ★</strong>` : empty('Belum ada ulasan.','Ulasan pelanggan akan muncul di sini.')}</section>`;
    $$('.add-product').forEach((button) => button.onclick = () => productForm());
    $$('.add-order').forEach((button) => button.onclick = orderForm);
  }

  function renderCustomers() { const customers = StorageManager.get('customers'); const orders = StorageManager.get('orders'); $('#page').innerHTML = heading('Pelanggan','Pelanggan terbentuk otomatis ketika pesanan disimpan.') + table(customers,['Pelanggan','Kontak','Jumlah Order','Total Belanja'],(customer) => { const history = orders.filter((order) => order.customer === customer.name); return `<td><b>${safe(customer.name)}</b></td><td>${safe(customer.phone || '—')}</td><td>${history.length}</td><td>${rupiah(history.reduce((sum, order) => sum + Number(order.total), 0))}</td>`; },'Belum ada pelanggan','Pelanggan baru akan muncul dari pesanan.'); }
  function renderAnalytics() { const orders = StorageManager.get('orders'); const revenue = orders.filter((item) => item.status !== 'Dibatalkan').reduce((sum,item) => sum + Number(item.total),0); $('#page').innerHTML = heading('Analitik','Keputusan bisnis berdasarkan transaksi nyata.') + (orders.length ? `<div class="cards"><article class="stat-card"><span class="stat-icon">Rp</span><p>Total Revenue</p><strong>${rupiah(revenue)}</strong></article><article class="stat-card"><span class="stat-icon">▤</span><p>Total Pesanan</p><strong>${orders.length}</strong></article><article class="stat-card"><span class="stat-icon">÷</span><p>Rata-rata Pesanan</p><strong>${rupiah(revenue / orders.length)}</strong></article></div>` : empty('Belum cukup data untuk menampilkan analitik.','Tambahkan pesanan untuk melihat pola penjualan.')); }
  function renderPromotions() { const items = StorageManager.get('promotions'); $('#page').innerHTML = heading('Promo','Kelola penawaran restoran.','<button class="btn primary add" type="button">＋ Tambah Promo</button>') + table(items,['Nama Promo','Kode','Diskon','Status','Aksi'],(item) => `<td><b>${safe(item.name)}</b></td><td>${safe(item.code)}</td><td>${item.kind === 'Persentase' ? `${item.value}%` : rupiah(item.value)}</td><td>${badge(item.status)}</td>${actions('promotions',item.id)}`,'Belum ada promo','Buat promo untuk menarik lebih banyak pesanan.'); $('.add')?.addEventListener('click',() => simpleForm('promotions')); bindSimple('promotions'); }
  function renderInventory() { const products = StorageManager.get('products'); const threshold = Number(StorageManager.get('settings').stockThreshold); $('#page').innerHTML = heading('Inventori',`Stok menipis saat ≤ ${threshold}. Ubah batasnya di Pengaturan.`) + table(products,['Menu','Kategori','Stok','Status'],(item) => `<td><b>${safe(item.name)}</b></td><td>${safe(item.category || '—')}</td><td>${item.stock}</td><td>${badge(item.stock === 0 ? 'Habis' : item.stock <= threshold ? 'Menipis' : 'Aman')}</td>`,'Belum ada inventori','Stok menu akan tampil saat menu ditambahkan.'); }
  function renderReviews() { const items = StorageManager.get('reviews'); $('#page').innerHTML = heading('Ulasan','Tinjau pengalaman pelanggan.','<button class="btn primary add" type="button">＋ Tambah Ulasan</button>') + table(items,['Pelanggan','Menu','Rating','Komentar','Status','Aksi'],(item) => `<td><b>${safe(item.customer)}</b></td><td>${safe(item.menu || '—')}</td><td>${'★'.repeat(item.rating)}</td><td>${safe(item.comment || '—')}</td><td>${badge(item.status)}</td>${actions('reviews',item.id)}`,'Belum ada ulasan','Ulasan pelanggan akan muncul di sini.'); $('.add')?.addEventListener('click',() => simpleForm('reviews')); bindSimple('reviews'); }
  function renderNotifications() { const items = StorageManager.get('notifications'); $('#page').innerHTML = heading('Notifikasi','Tetap tahu setiap perubahan penting.',items.length ? '<button class="btn secondary read-all" type="button">Tandai semua dibaca</button>' : '') + (items.length ? `<section class="panel mini-list">${[...items].reverse().map((item) => `<div class="warning-item"><span class="warning-dot">◌</span><div class="rank-meta"><b>${safe(item.text)}</b><small>${date(item.createdAt)}</small></div>${badge(item.read ? 'Dibaca' : 'Baru')}<button class="small-btn remove-note" data-id="${item.id}">×</button></div>`).join('')}</section>` : empty('Belum ada notifikasi','Pemberitahuan operasional akan tampil di sini.')); $('.read-all')?.addEventListener('click',() => { StorageManager.set('notifications',items.map((item) => ({...item,read:true}))); toast('Semua notifikasi sudah dibaca'); render(); }); $$('.remove-note').forEach((button) => button.onclick = () => { StorageManager.set('notifications',items.filter((item) => item.id !== button.dataset.id)); render(); }); }
  function renderSettings() { const restaurant=StorageManager.get('restaurant'),settings=StorageManager.get('settings'),admin=StorageManager.get('admin'); $('#page').innerHTML = `${heading('Pengaturan','Semua informasi restoran disimpan secara lokal.')}<form id="settingsForm"><section class="panel"><div class="panel-head"><h2>Profil Restoran</h2></div><div class="form-grid"><label>Nama Restoran<input name="name" value="${safe(restaurant.name)}"></label><label>Telepon<input name="phone" value="${safe(restaurant.phone)}"></label><label>Email<input name="email" value="${safe(restaurant.email)}"></label><label>Jam Operasional<input name="hours" value="${safe(restaurant.hours)}"></label><label class="full">Alamat<textarea name="address">${safe(restaurant.address)}</textarea></label></div></section><section class="panel full-panel"><div class="panel-head"><h2>Pengaturan Pesanan</h2></div><div class="form-grid"><label>Warna Utama<input name="primary" type="color" value="${settings.primary}"></label><label>Batas Stok<input name="threshold" type="number" value="${settings.stockThreshold}"></label><label>Prefix Pesanan<input name="prefix" value="${safe(settings.orderPrefix)}"></label><label>Pajak<input name="tax" type="number" value="${settings.tax}"></label></div></section><section class="panel full-panel"><div class="panel-head"><h2>Profil Admin</h2></div><div class="form-grid"><label>Nama Admin<input name="adminName" value="${safe(admin.name)}"></label><label>Username<input name="username" value="${safe(admin.username)}"></label><label>Password Lokal<input name="password" type="password" value="${safe(admin.password)}"></label></div></section><div class="form-actions"><button class="btn secondary" id="export" type="button">Ekspor Data</button><label class="btn secondary">Impor Data<input id="import" type="file" accept="application/json" hidden></label><button class="btn danger" id="reset" type="button">Reset Semua</button><button class="btn primary">Simpan Pengaturan</button></div></form>`; $('#settingsForm').onsubmit=(event)=>{event.preventDefault();const v=Object.fromEntries(new FormData(event.currentTarget));StorageManager.set('restaurant',{...restaurant,name:v.name,phone:v.phone,email:v.email,hours:v.hours,address:v.address});StorageManager.set('settings',{...settings,primary:v.primary,stockThreshold:Number(v.threshold),orderPrefix:v.prefix,tax:Number(v.tax)});StorageManager.set('admin',{...admin,name:v.adminName,username:v.username,password:v.password});document.documentElement.style.setProperty('--primary',v.primary);toast('Pengaturan berhasil disimpan');}; $('#export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([StorageManager.backup()],{type:'application/json'}));a.download='selera-sambal-backup.json';a.click();}; $('#import').onchange=(event)=>{const reader=new FileReader();reader.onload=()=>{try{StorageManager.restore(JSON.parse(reader.result));notice('Data berhasil diimpor');render();}catch{toast('File backup tidak valid.');}};if(event.target.files[0])reader.readAsText(event.target.files[0]);}; $('#reset').onclick=()=>confirmDelete('Reset seluruh data lokal?',()=>{StorageManager.reset();toast('Semua data sudah direset');render();}); }
  function quickAdd() { if (page === 'products' || page === 'dashboard') productForm(); else if (page === 'orders') orderForm(); else if (['categories','promotions','reviews'].includes(page)) simpleForm(page); else productForm(); }
  function render() { shell(); ({dashboard:renderDashboard,products:renderProducts,categories:renderCategories,orders:renderOrders,customers:renderCustomers,analytics:renderAnalytics,promotions:renderPromotions,inventory:renderInventory,reviews:renderReviews,notifications:renderNotifications,settings:renderSettings})[page](); }
  function login() { const admin=StorageManager.get('admin'); if(sessionStorage.getItem('ss_session')||localStorage.getItem('ss_remember')){location.href='dashboard.html';return;} $('#loginUsername').value=admin.username; $('.reveal').onclick=()=>{$('#loginPassword').type=$('#loginPassword').type==='password'?'text':'password';}; $('#loginForm').onsubmit=(event)=>{event.preventDefault();if($('#loginUsername').value===admin.username&&$('#loginPassword').value===admin.password){sessionStorage.setItem('ss_session','1');if($('#remember').checked)localStorage.setItem('ss_remember','1');location.href='dashboard.html';}else toast('Username atau password tidak sesuai.');}; }
  if (document.body.classList.contains('login-page')) login(); else if (!sessionStorage.getItem('ss_session') && !localStorage.getItem('ss_remember')) location.href='index.html'; else render();
}());
