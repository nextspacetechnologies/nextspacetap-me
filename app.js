(function () {
  'use strict';
  var SUPABASE_URL = 'https://mnsbieqfbhkvcufeaica.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_IS1EfDXlt-s68ESEaHY-Fg_WCV11GTw';
  var UPLOAD_PREFIX = SUPABASE_URL + '/storage/v1/object/public/tap-uploads/';
  var app = document.getElementById('app');

  // ---- safe DOM helpers: all user text goes through textContent, never innerHTML ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }
  function str(v, max) { return (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '')).slice(0, max || 500); }
  function safeHref(u) {
    u = str(u, 2000).trim();
    return /^(https?:\/\/|mailto:|tel:)/i.test(u) ? u : '';
  }
  function safeImg(u) { u = str(u, 2000).trim(); return u.indexOf(UPLOAD_PREFIX) === 0 ? u : ''; }
  function ytId(u) {
    var m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(str(u, 500).trim());
    return m ? m[1] : '';
  }
  function safeColor(c) { return /^#[0-9a-fA-F]{6}$/.test(str(c, 7)) ? c : '#0d1440'; }
  function lum(hex) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function link(href, label, cls) {
    var h = safeHref(href);
    if (!h) return null;
    var a = el('a', cls || 'btn', label);
    a.href = h;
    if (/^https?:/i.test(h)) { a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; }
    return a;
  }

  function getSlug() {
    var path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    var s = path ? path.split('/')[0] : '';
    if (!s) { var m = /[?&]u=([^&]*)/.exec(window.location.search); s = m ? m[1] : ''; }
    try { s = decodeURIComponent(s); } catch (e) { s = ''; }
    return /^[A-Za-z0-9_.-]{1,80}$/.test(s) ? s.toLowerCase() : '';
  }

  function notFound() {
    app.textContent = '';
    var box = el('div', 'center');
    box.appendChild(el('h1', '', 'Profile not found'));
    var p = el('p', '', "This NextSpace TAP link doesn't match an active profile. Double-check the link, or get your own at ");
    var a = el('a', '', 'tap.nextspacetechnologies.com');
    a.href = 'https://tap.nextspacetechnologies.com/';
    p.appendChild(a);
    box.appendChild(p);
    app.appendChild(box);
  }

  function section(title) {
    var s = el('div', 'sec');
    s.appendChild(el('h2', '', title));
    return s;
  }

  function itemLabel(it) {
    if (typeof it === 'string') return it;
    if (!it || typeof it !== 'object') return '';
    return str(it.label || it.title || it.name || it.platform || it.type || '', 80);
  }
  function itemUrl(it) {
    if (typeof it === 'string') return it;
    if (!it || typeof it !== 'object') return '';
    return str(it.url || it.href || it.link || it.value || '', 2000);
  }

  function vcard(p) {
    function e(s) { return String(s).replace(/[\\;,]/g, function (c) { return '\\' + c; }).replace(/\r?\n/g, '\\n'); }
    var l = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + e(str(p.display_name, 80))];
    if (p.title_desc) l.push('TITLE:' + e(str(p.title_desc, 120)));
    if (p.mobile_1) l.push('TEL;TYPE=CELL:' + e(str(p.mobile_1, 30)));
    if (p.mobile_2) l.push('TEL;TYPE=CELL:' + e(str(p.mobile_2, 30)));
    if (p.email_1) l.push('EMAIL:' + e(str(p.email_1, 254)));
    if (p.email_2) l.push('EMAIL:' + e(str(p.email_2, 254)));
    l.push('URL:' + e(window.location.href.split('#')[0]));
    l.push('END:VCARD');
    return l.join('\r\n');
  }

  function render(p) {
    var bg = safeColor(p.background_color);
    var dark = lum(bg) < 0.6;
    document.documentElement.style.setProperty('--bg', bg);
    document.body.style.background = bg;
    document.body.style.color = dark ? '#ffffff' : '#12183a';
    document.title = str(p.display_name, 80) + ' | NextSpace TAP';

    app.textContent = '';
    var wrap = el('div', 'wrap');

    var cover = el('div', 'cover');
    var cv = safeImg(p.cover_photo_url);
    if (cv) cover.style.backgroundImage = 'url("' + cv + '")';
    wrap.appendChild(cover);

    var head = el('div', 'head');
    var ph = safeImg(p.profile_photo_url);
    if (ph) {
      var av = el('img', 'avatar'); av.src = ph; av.alt = ''; av.decoding = 'async';
      head.appendChild(av);
    }
    var lg = safeImg(p.logo_url);
    if (lg) { var lo = el('img', 'logo'); lo.src = lg; lo.alt = ''; head.appendChild(lo); }
    head.appendChild(el('h1', 'name', str(p.display_name, 80)));
    if (p.title_desc) head.appendChild(el('p', 'title', str(p.title_desc, 120)));
    if (p.status_text || p.status_emoji) {
      head.appendChild(el('div', 'status', (str(p.status_emoji, 16) + ' ' + str(p.status_text, 80)).trim()));
    }
    wrap.appendChild(head);
    if (p.short_bio) wrap.appendChild(el('p', 'bio', str(p.short_bio, 500)));

    // primary contact buttons
    var btns = el('div', 'btns');
    var b;
    if ((b = link(p.mobile_1 ? 'tel:' + str(p.mobile_1, 30).replace(/[^0-9+]/g, '') : '', 'Call ' + str(p.mobile_1, 30), 'btn primary'))) btns.appendChild(b);
    if ((b = link(p.email_1 ? 'mailto:' + str(p.email_1, 254) : '', 'Email ' + str(p.email_1, 254), 'btn'))) btns.appendChild(b);
    if ((b = link(p.mobile_2 ? 'tel:' + str(p.mobile_2, 30).replace(/[^0-9+]/g, '') : '', 'Call ' + str(p.mobile_2, 30), 'btn'))) btns.appendChild(b);
    if ((b = link(p.email_2 ? 'mailto:' + str(p.email_2, 254) : '', 'Email ' + str(p.email_2, 254), 'btn'))) btns.appendChild(b);
    var save = el('button', 'btn', 'Save contact');
    save.type = 'button';
    save.addEventListener('click', function () {
      var blob = new Blob([vcard(p)], { type: 'text/vcard' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (str(p.display_name, 40).replace(/[^A-Za-z0-9 _-]/g, '') || 'contact') + '.vcf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    btns.appendChild(save);
    wrap.appendChild(btns);

    // links (sections: object of arrays)
    var secs = p.sections && typeof p.sections === 'object' && !Array.isArray(p.sections) ? p.sections : {};
    Object.keys(secs).slice(0, 40).forEach(function (k) {
      var items = arr(secs[k]).slice(0, 500);
      var made = [];
      items.forEach(function (it) {
        var a = link(itemUrl(it), itemLabel(it) || str(k, 40), 'btn');
        if (a) made.push(a);
      });
      if (!made.length) return;
      var s = section(str(k, 40).replace(/_/g, ' '));
      var col = el('div', 'btns'); col.style.padding = '0';
      made.forEach(function (a) { col.appendChild(a); });
      s.appendChild(col);
      wrap.appendChild(s);
    });

    // services
    var svc = arr(p.services).slice(0, 50);
    if (svc.length) {
      var ss = section('Services');
      svc.forEach(function (it) {
        var c = el('div', 'card');
        c.appendChild(el('b', '', str(it && (it.title || it.name) || (typeof it === 'string' ? it : ''), 120)));
        if (it && it.description) c.appendChild(el('p', '', str(it.description, 500)));
        if (it && it.price) c.appendChild(el('span', '', str(it.price, 40)));
        ss.appendChild(c);
      });
      wrap.appendChild(ss);
    }

    // products
    var prods = arr(p.products).slice(0, 20);
    if (prods.length) {
      var ps = section('Products');
      prods.forEach(function (it) {
        var c = el('div', 'card');
        c.appendChild(el('b', '', str(it && (it.title || it.name), 120)));
        if (it && it.description) c.appendChild(el('p', '', str(it.description, 500)));
        if (it && it.price) c.appendChild(el('span', '', str(it.price, 40)));
        var a = it && link(it.url || it.link, 'View', 'btn'); if (a) { a.style.marginTop = '8px'; c.appendChild(a); }
        ps.appendChild(c);
      });
      wrap.appendChild(ps);
    }

    // posts
    var posts = arr(p.posts).slice(0, 20);
    if (posts.length) {
      var po = section('Updates');
      posts.forEach(function (it) {
        var c = el('div', 'card');
        if (it && it.title) c.appendChild(el('b', '', str(it.title, 120)));
        c.appendChild(el('p', '', str(it && (it.body || it.text || it.content || (typeof it === 'string' ? it : '')), 800)));
        po.appendChild(c);
      });
      wrap.appendChild(po);
    }

    // gallery: images, pdfs, youtube
    var gal = arr(p.gallery).slice(0, 200);
    if (gal.length) {
      var gs = section('Gallery');
      var grid = el('div', 'grid');
      gal.forEach(function (it) {
        if (!it || typeof it !== 'object') return;
        var t = str(it.type, 12), u = str(it.url, 2000);
        if (t === 'youtube') {
          var id = ytId(u); if (!id) return;
          var box = el('div', 'vid');
          var f = document.createElement('iframe');
          f.src = 'https://www.youtube-nocookie.com/embed/' + id;
          f.loading = 'lazy'; f.title = str(it.title, 80) || 'Video';
          f.setAttribute('allow', 'accelerometer; encrypted-media; picture-in-picture');
          f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          f.setAttribute('allowfullscreen', '');
          box.appendChild(f); gs.appendChild(box);
        } else if (t === 'pdf') {
          var h = safeImg(u); if (!h) return;
          var a = el('a', 'btn', str(it.title, 80) || 'Download PDF');
          a.href = h; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.style.marginBottom = '10px'; gs.appendChild(a);
        } else {
          var s = safeImg(u); if (!s) return;
          var im = el('img'); im.src = s; im.alt = str(it.title, 80); im.loading = 'lazy'; im.decoding = 'async';
          grid.appendChild(im);
        }
      });
      if (grid.children.length) gs.appendChild(grid);
      if (gs.children.length > 1) wrap.appendChild(gs);
    }

    // business hours
    var hrs = arr(p.business_hours).slice(0, 14);
    if (hrs.length) {
      var hs = section('Business hours');
      hrs.forEach(function (it) {
        if (!it || typeof it !== 'object') return;
        var row = el('div', 'hours');
        row.appendChild(el('span', '', str(it.day, 20)));
        row.appendChild(el('span', '', it.closed ? 'Closed' : (str(it.open || it.from, 10) + ' - ' + str(it.close || it.to, 10))));
        hs.appendChild(row);
      });
      wrap.appendChild(hs);
    }

    var foot = el('div', 'foot', 'Powered by ');
    var fa = el('a', '', 'NextSpace TAP');
    fa.href = 'https://tap.nextspacetechnologies.com/'; fa.rel = 'noopener';
    foot.appendChild(fa);
    wrap.appendChild(foot);

    app.appendChild(wrap);
  }

  var slug = getSlug();
  if (!slug) { notFound(); return; }

  fetch(SUPABASE_URL + '/rest/v1/rpc/tap_get_profile_by_slug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    body: JSON.stringify({ p_slug: slug })
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (p) {
      if (!p || typeof p !== 'object' || Array.isArray(p) || !p.display_name) { notFound(); return; }
      render(p);
    })
    .catch(notFound);
})();
