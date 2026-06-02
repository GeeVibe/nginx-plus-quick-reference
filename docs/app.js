/* ================================================
   NGINX Plus Directive Guide — Application Logic
   Search, Filter, Smooth Scroll, Marketecture Diagrams, Config Snippets
   ================================================ */

(function () {
  'use strict';

  // === DOM References ===
  const topNav = document.getElementById('topNav');
  const searchInput = document.getElementById('searchInput');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const mobileSearchBtn = document.getElementById('mobileSearchBtn');
  const mobileSearchBar = document.getElementById('mobileSearchBar');
  const filterPills = document.querySelectorAll('.pill');
  const categorySections = document.querySelectorAll('.category-section');
  const allCards = document.querySelectorAll('.card');
  const resultsText = document.getElementById('resultsText');
  const noResults = document.getElementById('noResults');
  const mainContent = document.getElementById('mainContent');
  const clearFiltersBtn = document.getElementById('clearFilters');

  // Hero diagram panel refs
  const statsBar = document.getElementById('statsBar');
  const heroDiagramPanel = document.getElementById('heroDiagramPanel');
  const heroCategoryLabel = document.getElementById('heroCategoryLabel');
  const heroDiagramWrap = document.getElementById('heroDiagramWrap');
  const heroDiagramBack = document.getElementById('heroDiagramBack');

  // Config snippet panel refs
  const configSnippetPanel = document.getElementById('configSnippetPanel');
  const configPanelHeader = document.getElementById('configPanelHeader');
  const configPanelTitle = document.getElementById('configPanelTitle');
  const configPanelSubtitle = document.getElementById('configPanelSubtitle');
  const configPanelBody = document.getElementById('configPanelBody');
  const configCodeBlock = document.getElementById('configCodeBlock');
  const configSourceLink = document.getElementById('configSourceLink');
  const configPanelToggleText = document.getElementById('configPanelToggleText');
  const configPanelToggleIcon = document.getElementById('configPanelToggleIcon');

  let activeCategory = 'all';
  let searchQuery = '';
  let configPanelCollapsed = false;

  // ============================================================
  // SVG DIAGRAM DEFINITIONS
  // Each returns an SVG string. Dimensions: 660 x 200 (default)
  // Style: dark boxes, teal/green borders, white text, arrows
  // ============================================================

  // Shared SVG helper components
  function svgDefs() {
    return `<defs>
      <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#00b4d8"/>
      </marker>
      <marker id="ahg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#06d6a0"/>
      </marker>
      <marker id="ahr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#e74c3c"/>
      </marker>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;
  }

  function box(x, y, w, h, label, sublabel, color) {
    color = color || '#00b4d8';
    var bg = color === 'green' ? 'rgba(6,214,160,0.1)' :
             color === 'red'   ? 'rgba(231,76,60,0.12)' :
             color === 'orange'? 'rgba(255,159,67,0.1)' :
                                 'rgba(0,180,216,0.1)';
    var stroke = color === 'green' ? '#06d6a0' :
                 color === 'red'   ? '#e74c3c' :
                 color === 'orange'? '#ff9f43' :
                                    '#00b4d8';
    var subY = sublabel ? y + h / 2 + 6 : y + h / 2 + 5;
    var mainY = sublabel ? y + h / 2 - 5 : y + h / 2 + 5;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${x + w/2}" y="${mainY}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="600" fill="#e8e8e8">${escSvg(label)}</text>
      ${sublabel ? `<text x="${x + w/2}" y="${subY + 10}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#a8a8b8">${escSvg(sublabel)}</text>` : ''}`;
  }

  function arrow(x1, y1, x2, y2, color, label) {
    color = color || 'teal';
    var markerEnd = color === 'green' ? 'url(#ahg)' : color === 'red' ? 'url(#ahr)' : 'url(#ah)';
    var stroke = color === 'green' ? '#06d6a0' : color === 'red' ? '#e74c3c' : '#00b4d8';
    var mx = (x1 + x2) / 2;
    var my = (y1 + y2) / 2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.5" marker-end="${markerEnd}" stroke-dasharray="none"/>
      ${label ? `<text x="${mx}" y="${my - 5}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#a8a8b8">${escSvg(label)}</text>` : ''}`;
  }

  function svgWrap(w, h, content, opts) {
    w = w || 660; h = h || 200;
    // Add padding around all diagrams to prevent clipping
    var pad = (opts && opts.pad) || 20;
    var vx = -(pad);
    var vy = (opts && typeof opts.top === 'number') ? -(opts.top) : -(pad);
    var vw = w + pad * 2;
    var vh = h + pad + ((opts && typeof opts.top === 'number') ? opts.top : pad);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${vx} ${vy} ${vw} ${vh}" font-family="Inter, sans-serif">${svgDefs()}${content}</svg>`;
  }

  function escSvg(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ---- Per-category diagrams ----

  const DIAGRAMS = {

    auth: function() {
      // Client → NGINX Plus [auth_jwt/auth_oidc] → Identity Provider → Backend App
      var content = '';
      content += box(10,  80, 100, 50, 'Client', 'Browser / API');
      content += arrow(112, 105, 168, 105, 'teal', 'Request');
      content += box(170, 65, 160, 80, 'NGINX Plus', 'auth_jwt / auth_oidc', 'teal');
      content += arrow(332, 105, 388, 105, 'teal', 'Validate');
      content += box(390, 68, 148, 74, 'Identity Provider', 'Okta / Azure AD', 'green');
      content += `<path d="M466 68 Q466 20 330 20 Q200 20 200 64" stroke="#06d6a0" stroke-width="1.5" fill="none" marker-end="url(#ahg)" stroke-dasharray="4,3"/>`;
      content += `<text x="330" y="14" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" fill="#a8a8b8">token issued / validated</text>`;
      content += arrow(332, 115, 388, 135, 'green', '');
      content += box(420, 148, 130, 46, 'Backend App', null, 'green');
      content += arrow(332, 125, 432, 148, 'teal', 'proxy_pass');
      return svgWrap(560, 210, content);
    },

    health: function() {
      // NGINX Plus probing 3 backends, one red/unhealthy, traffic routed away
      var content = '';
      // NGINX Plus node
      content += box(20, 75, 130, 60, 'NGINX Plus', 'health_check', 'teal');
      // Backend 1 - healthy
      content += box(260, 20, 130, 50, 'backend1', ':8080 ✓', 'green');
      content += arrow(152, 90, 258, 45, 'teal', 'probe');
      content += arrow(152, 98, 258, 50, 'teal', '');
      // Backend 2 - healthy
      content += box(260, 95, 130, 50, 'backend2', ':8080 ✓', 'green');
      content += arrow(152, 103, 258, 120, 'teal', 'probe');
      // Backend 3 - unhealthy
      content += box(260, 170, 130, 50, 'backend3', ':8080 ✗ DOWN', 'red');
      content += arrow(152, 115, 258, 195, 'red', 'probe');
      // Status labels
      content += `<text x="440" y="50" font-family="Inter,sans-serif" font-size="10" fill="#06d6a0">traffic ✓</text>`;
      content += `<text x="440" y="125" font-family="Inter,sans-serif" font-size="10" fill="#06d6a0">traffic ✓</text>`;
      content += `<text x="440" y="200" font-family="Inter,sans-serif" font-size="10" fill="#e74c3c">no traffic</text>`;
      content += arrow(392, 45, 436, 45, 'green', '');
      content += arrow(392, 120, 436, 120, 'green', '');
      content += `<line x1="392" y1="195" x2="436" y2="195" stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="4,3"/>`;
      return svgWrap(520, 240, content);
    },

    api: function() {
      // CI/CD / Dashboard → REST API → NGINX Plus → Backend Pool
      var content = '';
      content += box(10, 50, 140, 50, 'CI/CD Pipeline', '+ Dashboard', 'orange');
      content += arrow(152, 75, 208, 75, 'teal', 'POST /api/9/...');
      content += box(210, 50, 140, 50, 'NGINX Plus', 'REST API', 'teal');
      content += arrow(352, 75, 408, 75, 'teal', 'no reload');
      content += box(410, 35, 150, 80, 'Backend Pool', 'zone/upstream', 'green');
      // Live update annotation
      content += `<rect x="130" y="118" width="300" height="32" rx="5" fill="rgba(0,180,216,0.06)" stroke="rgba(0,180,216,0.2)" stroke-width="1"/>`;
      content += `<text x="280" y="137" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="#a8a8b8">add server · remove server · drain · query metrics</text>`;
      return svgWrap(580, 165, content);
    },

    lb: function() {
      // Clients → NGINX Plus [least_time / sticky / queue] → Backend Pool
      var content = '';
      content += box(10, 75, 100, 50, 'Clients', null, 'teal');
      content += arrow(112, 100, 168, 100, 'teal', '');
      content += box(170, 55, 160, 90, 'NGINX Plus', 'least_time · sticky\nqueue · slow_start', 'teal');
      // weighted arrows to backends
      content += arrow(332, 80, 408, 45, 'green', '70%');
      content += arrow(332, 100, 408, 100, 'teal', '25%');
      content += arrow(332, 118, 408, 155, 'teal', '5% (backup)');
      content += box(410, 20, 140, 50, 'backend1', 'weight=3', 'green');
      content += box(410, 75, 140, 50, 'backend2', 'weight=1', 'teal');
      content += box(410, 130, 140, 50, 'backend3', 'backup', null);
      return svgWrap(580, 200, content);
    },

    kv: function() {
      // Admin API → keyval_zone → NGINX Plus decision logic → Allow/Deny/Route
      var content = '';
      content += box(10, 75, 120, 50, 'Admin API', 'curl / automation', 'orange');
      content += arrow(132, 100, 188, 100, 'teal', 'POST key/value');
      content += box(190, 65, 145, 70, 'keyval_zone', 'denylist:1m', 'teal');
      content += arrow(337, 100, 393, 100, 'teal', '$deny_status');
      content += box(395, 60, 145, 80, 'NGINX Plus', 'decision logic', 'teal');
      // Allow / Deny outputs
      content += arrow(542, 85, 590, 60, 'green', 'Allow → proxy');
      content += arrow(542, 115, 590, 140, 'red', 'Deny → 403');
      content += `<text x="595" y="58" font-family="Inter,sans-serif" font-size="10" fill="#06d6a0">backend</text>`;
      content += `<text x="595" y="142" font-family="Inter,sans-serif" font-size="10" fill="#e74c3c">blocked</text>`;
      return svgWrap(660, 200, content);
    },

    ha: function() {
      // Two NGINX Plus nodes with zone_sync arrows, shared state in middle
      var content = '';
      content += box(20, 60, 150, 80, 'NGINX Plus', 'Node A', 'teal');
      content += box(390, 60, 150, 80, 'NGINX Plus', 'Node B', 'teal');
      // Shared state bubble
      content += `<ellipse cx="280" cy="100" rx="80" ry="36" fill="rgba(6,214,160,0.07)" stroke="rgba(6,214,160,0.3)" stroke-width="1.5"/>`;
      content += `<text x="280" y="95" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" font-weight="600" fill="#06d6a0">Shared State</text>`;
      content += `<text x="280" y="110" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#a8a8b8">sticky · kv · rate limits</text>`;
      // zone_sync arrows
      content += `<line x1="172" y1="90" x2="198" y2="92" stroke="#00b4d8" stroke-width="1.5" marker-end="url(#ah)"/>`;
      content += `<line x1="362" y1="90" x2="338" y2="92" stroke="#00b4d8" stroke-width="1.5" marker-end="url(#ah)"/>`;
      content += `<line x1="198" y1="108" x2="172" y2="110" stroke="#00b4d8" stroke-width="1.5" marker-end="url(#ah)"/>`;
      content += `<line x1="338" y1="108" x2="362" y2="110" stroke="#00b4d8" stroke-width="1.5" marker-end="url(#ah)"/>`;
      content += `<text x="280" y="165" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="#00b4d8">zone_sync · port 9000 SSL</text>`;
      // Client arrows
      content += `<text x="20" y="50" font-family="Inter,sans-serif" font-size="10" fill="#a8a8b8">Clients →</text>`;
      content += `<text x="390" y="50" font-family="Inter,sans-serif" font-size="10" fill="#a8a8b8">Clients →</text>`;
      return svgWrap(580, 185, content);
    },

    iot: function() {
      // IoT Devices → NGINX Plus [mqtt_preread] → MQTT Broker Cluster (by client ID)
      var content = '';
      // IoT devices
      content += `<rect x="10" y="20" width="100" height="36" rx="6" fill="rgba(255,159,67,0.1)" stroke="#ff9f43" stroke-width="1.5"/>`;
      content += `<text x="60" y="42" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" font-weight="600" fill="#e8e8e8">IoT Device A</text>`;
      content += `<rect x="10" y="82" width="100" height="36" rx="6" fill="rgba(255,159,67,0.1)" stroke="#ff9f43" stroke-width="1.5"/>`;
      content += `<text x="60" y="104" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" font-weight="600" fill="#e8e8e8">IoT Device B</text>`;
      content += `<rect x="10" y="144" width="100" height="36" rx="6" fill="rgba(255,159,67,0.1)" stroke="#ff9f43" stroke-width="1.5"/>`;
      content += `<text x="60" y="166" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" font-weight="600" fill="#e8e8e8">IoT Device C</text>`;
      // arrows to NGINX Plus
      content += arrow(112, 38, 188, 80, 'teal', '');
      content += arrow(112, 100, 188, 100, 'teal', '');
      content += arrow(112, 162, 188, 120, 'teal', '');
      // NGINX Plus
      content += box(190, 65, 155, 70, 'NGINX Plus', 'mqtt_preread\nhash $clientid', 'teal');
      // arrows to brokers
      content += arrow(347, 85, 413, 55, 'green', 'client-A → broker1');
      content += arrow(347, 100, 413, 100, 'teal', 'client-B → broker1');
      content += arrow(347, 115, 413, 145, 'green', 'client-C → broker2');
      // Brokers
      content += box(415, 30, 130, 50, 'MQTT Broker 1', ':1883', 'green');
      content += box(415, 120, 130, 50, 'MQTT Broker 2', ':1883', 'green');
      return svgWrap(580, 200, content);
    },

    cache: function() {
      // Client → NGINX Plus [proxy_cache + purge] → Origin Server + cache hit/miss
      var content = '';
      content += box(10, 75, 100, 50, 'Client', null, 'teal');
      content += arrow(112, 100, 178, 100, 'teal', 'GET /page.html');
      content += box(180, 55, 160, 90, 'NGINX Plus', 'proxy_cache\nproxy_cache_purge', 'teal');
      // Cache HIT path (back to client)
      content += `<path d="M260 55 Q260 10 60 10 Q10 10 10 74" stroke="#06d6a0" stroke-width="1.5" fill="none" marker-end="url(#ahg)" stroke-dasharray="5,3"/>`;
      content += `<text x="155" y="8" text-anchor="middle" font-family="Inter,sans-serif" font-size="9.5" fill="#06d6a0">HIT — served from cache</text>`;
      // Cache MISS path to origin
      content += arrow(342, 100, 408, 100, 'teal', 'MISS → origin');
      content += box(410, 75, 130, 50, 'Origin Server', null, 'green');
      // Purge annotation
      content += `<rect x="140" y="155" width="220" height="26" rx="5" fill="rgba(0,180,216,0.06)" stroke="rgba(0,180,216,0.15)" stroke-width="1"/>`;
      content += `<text x="250" y="172" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#a8a8b8">PURGE /page.html → invalidate</text>`;
      return svgWrap(570, 195, content);
    },

    media: function() {
      // MP4 Storage → NGINX Plus [HLS module] → HLS Stream → Players
      var content = '';
      content += box(10, 70, 120, 60, 'MP4 Storage', '/var/media/', 'orange');
      content += arrow(132, 100, 188, 100, 'teal', 'read file');
      content += box(190, 55, 165, 90, 'NGINX Plus', 'ngx_http_hls_module\nhls_fragment 5s', 'teal');
      content += arrow(357, 100, 413, 100, 'green', 'HLS stream');
      content += box(415, 55, 140, 35, '.m3u8 playlist', null, 'green');
      content += box(415, 100, 140, 35, '.ts segments', null, 'green');
      // Players
      content += arrow(557, 72, 600, 55, 'teal', '');
      content += arrow(557, 117, 600, 130, 'teal', '');
      content += `<text x="605" y="58" font-family="Inter,sans-serif" font-size="10" fill="#a8a8b8">iOS/Safari</text>`;
      content += `<text x="605" y="132" font-family="Inter,sans-serif" font-size="10" fill="#a8a8b8">HLS Players</text>`;
      content += `<text x="270" y="165" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#a8a8b8">on-the-fly transcoding — no FFmpeg needed</text>`;
      return svgWrap(680, 185, content);
    },

    'session-log': function() {
      // Multiple request arrows → NGINX Plus → Single aggregated session log entry
      var content = '';
      // Multiple requests
      for (var i = 0; i < 4; i++) {
        var y = 30 + i * 40;
        content += `<rect x="10" y="${y}" width="110" height="28" rx="5" fill="rgba(0,180,216,0.07)" stroke="rgba(0,180,216,0.2)" stroke-width="1"/>`;
        content += `<text x="65" y="${y+18}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="#a8a8b8">Request ${i+1}</text>`;
        content += arrow(122, y + 14, 188, 95, 'teal', '');
      }
      content += box(190, 65, 160, 70, 'NGINX Plus', 'session_log_zone\ntimeout=30s', 'teal');
      content += arrow(352, 100, 408, 100, 'green', 'aggregated');
      content += box(410, 65, 165, 70, 'Session Log Entry', '$bytes_sent\n$time_local', 'green');
      content += `<text x="492" y="155" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#a8a8b8">1 log line per session</text>`;
      return svgWrap(600, 185, content);
    },

    routing: function() {
      // Request with variable → NGINX Plus [proxy_request_dynamic] → Dynamic upstream selection
      var content = '';
      content += box(10, 75, 120, 50, 'Incoming Request', '$uri / $header', 'orange');
      content += arrow(132, 100, 188, 100, 'teal', 'variable eval');
      content += box(190, 60, 165, 80, 'NGINX Plus', 'proxy_request_dynamic\nmap $uri $target', 'teal');
      content += arrow(357, 80, 413, 45, 'teal', '/api/v1');
      content += arrow(357, 100, 413, 100, 'teal', '/api/v2');
      content += arrow(357, 118, 413, 155, 'teal', 'default');
      content += box(415, 20, 140, 50, 'api_v1_backend', null, 'green');
      content += box(415, 75, 140, 50, 'api_v2_backend', null, 'green');
      content += box(415, 130, 140, 50, 'default_backend', null, null);
      return svgWrap(580, 200, content);
    },

    tls: function() {
      // Encrypted traffic → NGINX Plus [ssl_key_log_file] → Wireshark/Capture + Backend
      var content = '';
      content += box(10, 75, 120, 50, 'Client', 'TLS 1.3', 'teal');
      content += `<text x="155" y="85" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="#00b4d8">🔒 encrypted</text>`;
      content += arrow(132, 100, 188, 100, 'teal', '');
      content += box(190, 55, 165, 90, 'NGINX Plus', 'ssl_key_log_file\n/var/log/keys.log', 'teal');
      // Key log branch
      content += arrow(272, 55, 272, 10, 'orange', '');
      content += `<rect x="200" y="0" width="145" height="26" rx="5" fill="rgba(255,159,67,0.1)" stroke="#ff9f43" stroke-width="1"/>`;
      content += `<text x="272" y="17" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="#ff9f43">ssl_keys.log (SSLKEYLOG)</text>`;
      // Wireshark
      content += arrow(272, 0, 430, 0, 'orange', 'Wireshark / tshark');
      content += `<rect x="430" y="-12" width="130" height="26" rx="5" fill="rgba(255,159,67,0.1)" stroke="#ff9f43" stroke-width="1"/>`;
      content += `<text x="495" y="5" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="#ff9f43">Decrypt pcap</text>`;
      content += arrow(357, 100, 413, 100, 'green', 'proxy_pass');
      content += box(415, 75, 120, 50, 'Backend', null, 'green');
      return svgWrap(570, 185, content, { top: 35 });
    },

    tunnel: function() {
      // Client → HTTP CONNECT → NGINX Plus [tunnel_pass] → Arbitrary TCP destination
      var content = '';
      content += box(10, 75, 120, 50, 'Client', 'HTTP CONNECT', 'orange');
      content += `<text x="155" y="90" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#a8a8b8">CONNECT</text>`;
      content += `<text x="155" y="103" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#a8a8b8">example.com:443</text>`;
      content += arrow(132, 100, 188, 100, 'teal', '');
      content += box(190, 55, 165, 90, 'NGINX Plus', 'tunnel_pass\n$host:$server_port', 'teal');
      content += `<text x="355" y="90" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#a8a8b8">TCP tunnel</text>`;
      content += `<text x="355" y="103" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#a8a8b8">bidirectional</text>`;
      content += arrow(357, 100, 413, 100, 'green', '');
      content += box(415, 65, 150, 70, 'Arbitrary TCP Dest', 'HTTPS · SSH · any port', 'green');
      return svgWrap(590, 185, content);
    },

    internal: function() {
      // Request → NGINX Plus [internal_redirect] → Variable-based routing
      var content = '';
      content += box(10, 75, 120, 50, 'Incoming Request', '$arg_version', 'orange');
      content += arrow(132, 100, 188, 100, 'teal', 'internal_redirect');
      content += box(190, 55, 165, 90, 'NGINX Plus', '$redir_target\n/app or /app-v2', 'teal');
      content += arrow(357, 85, 413, 55, 'green', 'v2 → /app-v2');
      content += arrow(357, 115, 413, 145, 'teal', 'default → /app');
      content += box(415, 30, 140, 50, 'v2_backend', 'api v2', 'green');
      content += box(415, 120, 140, 50, 'v1_backend', 'api v1', 'teal');
      content += `<text x="330" y="178" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#a8a8b8">no external redirect — fully internal</text>`;
      return svgWrap(580, 190, content);
    },

    'stream-session': function() {
      // Failed health check → proxy_session_drop → Active TCP sessions closed → Client reconnects
      var content = '';
      content += box(10, 75, 130, 50, 'Active TCP Sessions', 'DB connections', 'teal');
      content += `<rect x="170" y="60" width="160" height="80" rx="7" fill="rgba(231,76,60,0.08)" stroke="#e74c3c" stroke-width="1.5"/>`;
      content += `<text x="250" y="95" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="#e8e8e8">NGINX Plus</text>`;
      content += `<text x="250" y="111" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#e74c3c">proxy_session_drop on</text>`;
      content += `<text x="250" y="127" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#a8a8b8">health_check fails</text>`;
      content += arrow(142, 100, 168, 100, 'red', 'DROP');
      content += arrow(332, 85, 408, 55, 'red', 'down server');
      content += box(410, 30, 140, 50, 'DB Server (DOWN)', null, 'red');
      content += arrow(332, 115, 408, 150, 'green', 'reconnect');
      content += box(410, 125, 140, 50, 'DB Server (UP)', null, 'green');
      content += `<text x="250" y="185" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#a8a8b8">immediate failover — no hanging sessions</text>`;
      return svgWrap(580, 200, content);
    },

    perf: function() {
      // NGINX Plus → stall_threshold → Event loop monitoring → Dashboard/Alerts
      var content = '';
      content += box(10, 70, 140, 60, 'NGINX Worker', 'event loop', 'teal');
      content += arrow(152, 100, 208, 100, 'teal', '');
      content += box(210, 55, 165, 90, 'NGINX Plus', 'stall_threshold 50ms\nstatus_zone metrics', 'teal');
      // Alert branch
      content += arrow(375, 75, 431, 45, 'orange', 'stall detected');
      content += box(433, 20, 140, 50, 'Error Log', 'warning emitted', 'orange');
      // Dashboard branch
      content += arrow(375, 115, 431, 145, 'green', 'metrics stream');
      content += box(433, 120, 140, 50, 'Dashboard', '/api/9/... JSON', 'green');
      return svgWrap(600, 190, content);
    },

    'proxy-proto': function() {
      // AWS NLB / Azure LB → PROXY Protocol v2 TLV → NGINX Plus → Extract metadata
      var content = '';
      content += box(10, 55, 140, 40, 'AWS NLB', 'PROXY Protocol v2', 'orange');
      content += box(10, 110, 140, 40, 'Azure LB', 'PROXY Protocol v2', 'orange');
      content += arrow(152, 75, 208, 95, 'teal', 'TLV header');
      content += arrow(152, 130, 208, 110, 'teal', 'TLV header');
      content += box(210, 65, 165, 90, 'NGINX Plus', 'proxy_protocol\n$tlv_aws_vpce_id\n$tlv_azure_pel_id', 'teal');
      content += arrow(377, 85, 433, 55, 'green', 'VPC ID → route');
      content += arrow(377, 115, 433, 145, 'green', 'Link ID → route');
      content += box(435, 30, 155, 50, 'Backend Pool A', 'VPC endpoint', 'green');
      content += box(435, 120, 155, 50, 'Backend Pool B', 'Azure Private Link', 'green');
      return svgWrap(615, 190, content);
    }
  };

  // ============================================================
  // CONFIG SNIPPETS DATA
  // ============================================================

  const CONFIG_SNIPPETS = {
    auth: {
      title: 'Authentication & SSO — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-jwt-authentication/',
      code: `# JWT Authentication at the Edge
server {
    listen 443 ssl;
    location /api/ {
        auth_jwt "API";
        auth_jwt_key_file /etc/nginx/jwt_keys.jwk;
        proxy_pass http://api_backend;
    }
}

# Native OIDC Single Sign-On
oidc_provider my_idp {
    issuer https://login.example.com/idp;
    client_id my-app-id;
    client_secret my-secret;
}
server {
    listen 443 ssl;
    location / {
        auth_oidc my_idp;
        proxy_pass http://app_backend;
    }
}`
    },
    health: {
      title: 'Active Health Checks — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/',
      code: `# Active Health Checks — Proactive Backend Monitoring
upstream backend {
    zone backend 64k;
    server backend1.example.com;
    server backend2.example.com;
}
server {
    location / {
        proxy_pass http://backend;
        health_check interval=5s fails=3 passes=2
                     uri=/health;
    }
}
match health_ok {
    status 200;
    body ~ "UP";
}`
    },
    api: {
      title: 'Dynamic Configuration & API — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/monitoring/live-activity-monitoring/',
      code: `# NGINX Plus REST API — Live Monitoring & Config
server {
    listen 8080;
    location /api {
        api write=on;
        allow 127.0.0.1;
        deny all;
    }
    location = /dashboard.html {
        root /usr/share/nginx/html;
    }
}
# Usage: curl -s localhost:8080/api/9/http/upstreams | jq
# Add server: curl -X POST -d '{"server":"10.0.0.5:80"}' \\
#   localhost:8080/api/9/http/upstreams/backend/servers`
    },
    lb: {
      title: 'Advanced Load Balancing — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/',
      code: `# Advanced Load Balancing — Least Time + Sticky + Queue
upstream backend {
    zone backend 64k;
    least_time header;
    server backend1.example.com slow_start=30s;
    server backend2.example.com;
    server 192.0.0.1 backup;
    sticky cookie srv_id expires=1h
           domain=.example.com path=/;
    queue 100 timeout=70;
}`
    },
    kv: {
      title: 'Key-Value Store — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/security-controls/denylisting-ip-addresses/',
      code: `# Dynamic Key-Value Store — IP Deny List via API
http {
    keyval_zone zone=denylist:1m state=/var/lib/nginx/denylist.json;
    keyval $remote_addr $deny_status zone=denylist;

    server {
        listen 80;
        if ($deny_status) { return 403; }

        location /api { api write=on; }
        location / { proxy_pass http://backend; }
    }
}
# Block an IP: curl -X POST -d '{"10.0.0.99":"1"}' \\
#   localhost/api/9/http/keyvals/denylist`
    },
    ha: {
      title: 'High Availability & Clustering — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/high-availability/zone_sync/',
      code: `# Cluster Zone Sync — Share State Across Nodes
upstream backend {
    zone backend 64k;
    server backend1.example.com;
    sticky learn zone=sessions:1m
           create=$upstream_cookie_session
           lookup=$cookie_session sync;
}
stream {
    resolver 10.0.0.53 valid=20s;
    server {
        listen 9000 ssl;
        zone_sync;
        zone_sync_server cluster.example.com:9000 resolve;
        zone_sync_ssl on;
    }
}`
    },
    iot: {
      title: 'IoT & MQTT — Configuration Example',
      source: 'https://nginx.org/en/docs/stream/ngx_stream_mqtt_preread_module.html',
      code: `# MQTT IoT Routing by Client ID
stream {
    mqtt_preread on;
    upstream broker_pool {
        zone mqtt 64k;
        hash $mqtt_preread_clientid consistent;
        server broker1.example.com:1883;
        server broker2.example.com:1883;
    }
    server {
        listen 1883;
        proxy_pass broker_pool;
        proxy_connect_timeout 1s;
    }
}`
    },
    cache: {
      title: 'Cache Management — Configuration Example',
      source: 'https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/',
      code: `# Cache Purge — Invalidate Content On Demand
proxy_cache_path /data/nginx/cache keys_zone=mycache:10m;
map $request_method $purge_method {
    PURGE 1;
    default 0;
}
server {
    location / {
        proxy_pass http://backend;
        proxy_cache mycache;
        proxy_cache_purge $purge_method;
    }
}
# Purge: curl -X PURGE https://example.com/page.html`
    },
    media: {
      title: 'Media Streaming — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_hls_module.html',
      code: `# HLS Streaming — MP4 to Adaptive Bitrate
location /video/ {
    hls;
    hls_fragment 5s;
    hls_buffers 10 10m;
    hls_mp4_buffer_size 1m;
    hls_mp4_max_buffer_size 5m;
    alias /var/media/;
}`
    },
    'session-log': {
      title: 'Session Logging — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_session_log_module.html',
      code: `# Session Logging — One Log Entry Per Session
session_log_zone /var/log/nginx/sessions
    zone=sessions:1m timeout=30s;
session_log_format default
    '$remote_addr [$time_local] $bytes_sent';
server {
    location / {
        session_log sessions;
        proxy_pass http://backend;
    }
}`
    },
    routing: {
      title: 'Dynamic Upstream Routing — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_request_dynamic',
      code: `# Dynamic Upstream Selection via Variables
map $uri $target_upstream {
    ~^/api/v1  api_v1_backend;
    ~^/api/v2  api_v2_backend;
    default    default_backend;
}
server {
    location / {
        proxy_pass http://$target_upstream;
        proxy_request_dynamic on;
    }
}`
    },
    tls: {
      title: 'TLS/SSL Debugging — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_key_log_file',
      code: `# TLS Key Logging for Wireshark Debugging
server {
    listen 443 ssl;
    ssl_certificate     /etc/ssl/server.crt;
    ssl_certificate_key /etc/ssl/server.key;
    ssl_key_log_file /var/log/nginx/ssl_keys.log;
    # Use: Wireshark > Preferences > TLS >
    #   (Pre)-Master-Secret log filename
    location / { proxy_pass http://backend; }
}`
    },
    tunnel: {
      title: 'HTTP Tunneling — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_tunnel_module.html',
      code: `# HTTP CONNECT Forward Proxy Tunneling
server {
    listen 3128;
    location / {
        tunnel_pass $host:$server_port;
        tunnel_connect_timeout 10s;
        tunnel_read_timeout 60s;
    }
}`
    },
    internal: {
      title: 'Internal Routing — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_internal_redirect_module.html',
      code: `# Programmatic Internal Redirect
location / {
    set $redir_target /app;
    if ($arg_version = "v2") {
        set $redir_target /app-v2;
    }
    internal_redirect $redir_target;
}
location /app { proxy_pass http://v1_backend; }
location /app-v2 { proxy_pass http://v2_backend; }`
    },
    'stream-session': {
      title: 'Stream Session Management — Configuration Example',
      source: 'https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html#proxy_session_drop',
      code: `# Immediate Session Drop on Health Failure
stream {
    upstream db_pool {
        zone db 64k;
        server db1.example.com:5432;
        server db2.example.com:5432;
    }
    server {
        listen 5432;
        proxy_pass db_pool;
        proxy_session_drop on;
        health_check interval=5s;
    }
}`
    },
    perf: {
      title: 'Performance & Observability — Configuration Example',
      source: 'https://nginx.org/en/docs/ngx_core_module.html#stall_threshold',
      code: `# Event Loop Stall Detection
stall_threshold 50ms;

# Per-Location Metrics Collection
server {
    listen 80;
    status_zone my_server;
    location /api/ {
        status_zone api_location;
        proxy_pass http://api_backend;
    }
    location /dashboard {
        api;
    }
}`
    },
    'proxy-proto': {
      title: 'PROXY Protocol Vendor Extensions — Configuration Example',
      source: 'https://nginx.org/en/docs/http/ngx_http_proxy_protocol_vendor_module.html',
      code: `# Read Cloud Metadata from PROXY Protocol v2
server {
    listen 80 proxy_protocol;
    set_real_ip_from 10.0.0.0/8;
    real_ip_header proxy_protocol;
    # AWS VPC Endpoint ID:
    #   $proxy_protocol_tlv_aws_vpce_id
    # Azure Link ID:
    #   $proxy_protocol_tlv_azure_pel_id
    location / {
        proxy_set_header X-VPC-Endpoint $proxy_protocol_tlv_aws_vpce_id;
        proxy_pass http://backend;
    }
}`
    }
  };

  // ============================================================
  // NGINX SYNTAX HIGHLIGHTER (regex-based, no external lib)
  // ============================================================

  function highlightNginx(code) {
    // Escape HTML first
    code = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    var keywords = [
      'server','location','upstream','stream','http','events',
      'listen','proxy_pass','proxy_cache','proxy_cache_purge','proxy_cache_path',
      'proxy_request_dynamic','proxy_session_drop','proxy_bind_dynamic',
      'proxy_set_header','proxy_protocol','proxy_connect_timeout','proxy_read_timeout',
      'health_check','health_check_timeout',
      'auth_jwt','auth_jwt_key_file','auth_jwt_type','auth_oidc','oidc_provider',
      'issuer','client_id','client_secret','pkce','scope','redirect_uri',
      'api','status_zone','status','status_format',
      'zone','zone_sync','zone_sync_server','zone_sync_ssl',
      'least_time','sticky','queue','slow_start','ntlm','drain',
      'keyval','keyval_zone','state',
      'mqtt_preread','mqtt','mqtt_set_connect',
      'hls','hls_fragment','hls_buffers','hls_mp4_buffer_size','hls_mp4_max_buffer_size','alias',
      'session_log','session_log_format','session_log_zone',
      'ssl_key_log_file','ssl_certificate','ssl_certificate_key',
      'tunnel_pass','tunnel_connect_timeout','tunnel_read_timeout',
      'internal_redirect','set','rewrite','map','if','return',
      'stall_threshold','resolver',
      'real_ip_header','set_real_ip_from',
      'allow','deny','include',
      'hash','consistent','backup','weight','max_fails','fail_timeout',
      'worker_processes','worker_connections',
      'access_log','error_log','log_format',
      'gzip','gzip_types','sendfile','tcp_nopush','keepalive_timeout',
      'default','match','body','on','off',
      'interval','fails','passes','timeout','uri'
    ];
    // Sort longest-first so multi-word directives match before shorter ones
    keywords.sort(function(a, b) { return b.length - a.length; });
    var kwSet = {};
    keywords.forEach(function(k) { kwSet[k] = true; });

    // Process line by line, tokenize each line to avoid regex-inside-span issues
    var lines = code.split('\n');
    lines = lines.map(function(line) {
      // Full-line comments
      if (/^\s*#/.test(line)) {
        return '<span class="nginx-comment">' + line + '</span>';
      }

      // Split on inline comment — highlight code part, then comment part
      var commentIdx = -1;
      var inQuote = false;
      var qChar = '';
      for (var ci = 0; ci < line.length; ci++) {
        var ch = line[ci];
        if (inQuote) {
          if (ch === qChar) inQuote = false;
        } else {
          if (ch === '"' || ch === "'") { inQuote = true; qChar = ch; }
          else if (ch === '#') { commentIdx = ci; break; }
        }
      }

      var codePart = commentIdx >= 0 ? line.substring(0, commentIdx) : line;
      var commentPart = commentIdx >= 0 ? line.substring(commentIdx) : '';

      // Tokenize the code part into segments
      // We'll build the output by scanning character by character
      var out = '';
      var i = 0;
      while (i < codePart.length) {
        var c = codePart[i];

        // Braces
        if (c === '{' || c === '}') {
          out += '<span class="nginx-brace">' + c + '</span>';
          i++;
          continue;
        }

        // Quoted strings
        if (c === '"' || c === "'") {
          var q = c;
          var str = c;
          i++;
          while (i < codePart.length && codePart[i] !== q) {
            str += codePart[i];
            i++;
          }
          if (i < codePart.length) { str += codePart[i]; i++; }
          out += '<span class="nginx-string">' + str + '</span>';
          continue;
        }

        // Variables ($name)
        if (c === '$') {
          var vr = '$';
          i++;
          while (i < codePart.length && /[a-zA-Z0-9_]/.test(codePart[i])) {
            vr += codePart[i];
            i++;
          }
          out += '<span class="nginx-variable">' + vr + '</span>';
          continue;
        }

        // Words (potential keywords or numbers)
        if (/[a-zA-Z0-9_]/.test(c)) {
          var word = '';
          while (i < codePart.length && /[a-zA-Z0-9_.\-\/]/.test(codePart[i])) {
            word += codePart[i];
            i++;
          }
          // Check for number with optional unit suffix
          if (/^\d+[kmgKMGs]?$/.test(word)) {
            out += '<span class="nginx-number">' + word + '</span>';
          } else if (kwSet[word]) {
            out += '<span class="nginx-keyword">' + word + '</span>';
          } else {
            out += word;
          }
          continue;
        }

        // Everything else (whitespace, semicolons, etc.)
        out += c;
        i++;
      }

      // Append comment if present
      if (commentPart) {
        out += '<span class="nginx-comment">' + commentPart + '</span>';
      }

      return out;
    });

    return lines.join('\n');
  }

  // ============================================================
  // CATEGORY LABELS (pretty names for the hero label)
  // ============================================================

  var CATEGORY_LABELS = {
    auth: 'Authentication & SSO',
    health: 'Active Health Checks',
    api: 'Dynamic Configuration & API',
    lb: 'Advanced Load Balancing',
    kv: 'Key-Value Store',
    ha: 'High Availability & Clustering',
    iot: 'IoT & MQTT',
    cache: 'Cache Management',
    media: 'Media Streaming',
    'session-log': 'Session Logging',
    routing: 'Dynamic Upstream Routing',
    tls: 'TLS/SSL Debugging & Security',
    tunnel: 'HTTP Tunneling',
    internal: 'Internal Routing',
    'stream-session': 'Stream Session Management',
    perf: 'Performance & Observability',
    'proxy-proto': 'PROXY Protocol Vendor Extensions'
  };

  // ============================================================
  // HERO DIAGRAM LOGIC
  // ============================================================

  function showHeroDiagram(category) {
    var diagramFn = DIAGRAMS[category];
    if (!diagramFn) return;

    // Set label text and show it
    heroCategoryLabel.textContent = CATEGORY_LABELS[category] || category;
    heroCategoryLabel.style.display = '';
    heroDiagramBack.style.display = '';

    // Render SVG into diagram panel
    heroDiagramWrap.innerHTML = diagramFn();

    // Hide stats, show diagram panel
    statsBar.style.display = 'none';
    heroDiagramPanel.classList.add('visible');
  }

  function showStatsBar() {
    // Hide diagram panel
    heroDiagramPanel.classList.remove('visible');

    // Show stats, hide category label + back button
    statsBar.style.display = '';
    heroCategoryLabel.style.display = 'none';
    heroDiagramBack.style.display = 'none';
  }

  // Back to overview button
  if (heroDiagramBack) {
    heroDiagramBack.addEventListener('click', function() {
      // Activate "All Categories" pill
      filterPills.forEach(function(p) { p.classList.remove('active'); });
      var allPill = document.querySelector('.pill[data-category="all"]');
      if (allPill) allPill.classList.add('active');

      activeCategory = 'all';
      showStatsBar();
      hideConfigPanel();
      applyFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ============================================================
  // CONFIG PANEL LOGIC
  // ============================================================

  function showConfigPanel(category) {
    var data = CONFIG_SNIPPETS[category];
    if (!data) return;

    configPanelTitle.textContent = data.title || 'Configuration Example';
    configPanelSubtitle.textContent = CATEGORY_LABELS[category] + ' · NGINX Plus';
    configCodeBlock.innerHTML = highlightNginx(data.code);
    configSourceLink.href = data.source || '#';

    // Set link text to domain part
    try {
      var domain = new URL(data.source).hostname;
      configSourceLink.textContent = domain;
    } catch(e) {
      configSourceLink.textContent = 'docs.nginx.com';
    }

    configSnippetPanel.style.display = 'block';
    // Reset collapse state
    configPanelCollapsed = false;
    configPanelBody.classList.remove('collapsed');
    configPanelToggleIcon.classList.remove('collapsed');
    configPanelToggleText.textContent = 'Collapse';

    // Animate in
    configSnippetPanel.classList.add('visible');
    setTimeout(function() {
      configSnippetPanel.classList.add('animated');
    }, 20);
  }

  function hideConfigPanel() {
    configSnippetPanel.classList.remove('animated');
    setTimeout(function() {
      configSnippetPanel.classList.remove('visible');
      configSnippetPanel.style.display = 'none';
    }, 350);
  }

  // Config panel toggle (collapse/expand)
  if (configPanelHeader) {
    configPanelHeader.addEventListener('click', function() {
      configPanelCollapsed = !configPanelCollapsed;
      if (configPanelCollapsed) {
        configPanelBody.classList.add('collapsed');
        configPanelToggleIcon.classList.add('collapsed');
        configPanelToggleText.textContent = 'Expand';
      } else {
        configPanelBody.classList.remove('collapsed');
        configPanelToggleIcon.classList.remove('collapsed');
        configPanelToggleText.textContent = 'Collapse';
      }
    });
  }

  // ============================================================
  // EXISTING LOGIC (preserved + wired into new features)
  // ============================================================

  // === Nav scroll effect ===
  function onScroll() {
    if (window.scrollY > 10) {
      topNav.classList.add('scrolled');
    } else {
      topNav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // === Keyboard shortcut: "/" to focus search ===
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== mobileSearchInput) {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        mobileSearchBar.classList.add('active');
        mobileSearchInput.focus();
      } else {
        searchInput.focus();
      }
    }
    if (e.key === 'Escape') {
      searchInput.blur();
      mobileSearchInput.blur();
      mobileSearchBar.classList.remove('active');
    }
  });

  // === Mobile search toggle ===
  if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', function () {
      mobileSearchBar.classList.toggle('active');
      if (mobileSearchBar.classList.contains('active')) {
        mobileSearchInput.focus();
      }
    });
  }

  // === Sync search inputs ===
  function syncSearch(value) {
    searchQuery = value.toLowerCase().trim();
    if (searchInput) searchInput.value = value;
    if (mobileSearchInput) mobileSearchInput.value = value;
    applyFilters();
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      syncSearch(this.value);
    });
  }
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', function () {
      syncSearch(this.value);
    });
  }

  // === Category pill click ===
  filterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      activeCategory = this.getAttribute('data-category');

      filterPills.forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');

      // Hero diagram / stats bar switching
      if (activeCategory !== 'all') {
        showHeroDiagram(activeCategory);
        showConfigPanel(activeCategory);
      } else {
        showStatsBar();
        hideConfigPanel();
      }

      applyFilters();
    });
  });

  // === Apply Filters (category + search) ===
  function applyFilters() {
    var visibleCount = 0;
    var visibleSections = new Set();

    allCards.forEach(function (card) {
      var section = card.closest('.category-section');
      var sectionCategory = section.getAttribute('data-category');
      var searchData = (card.getAttribute('data-search') || '').toLowerCase();
      var cardText = card.textContent.toLowerCase();
      var combinedSearch = searchData + ' ' + cardText;

      var categoryMatch = activeCategory === 'all' || sectionCategory === activeCategory;
      var searchMatch = !searchQuery || combinedSearch.indexOf(searchQuery) !== -1;

      // Also check for multi-word search: all words must match
      if (searchQuery && searchQuery.indexOf(' ') !== -1) {
        var words = searchQuery.split(/\s+/).filter(function(w) { return w.length > 0; });
        searchMatch = words.every(function (word) {
          return combinedSearch.indexOf(word) !== -1;
        });
      }

      if (categoryMatch && searchMatch) {
        card.classList.remove('hidden');
        visibleCount++;
        visibleSections.add(sectionCategory);
      } else {
        card.classList.add('hidden');
      }
    });

    // Show/hide category sections
    categorySections.forEach(function (section) {
      var sectionCategory = section.getAttribute('data-category');
      var categoryMatch = activeCategory === 'all' || sectionCategory === activeCategory;

      if (categoryMatch && visibleSections.has(sectionCategory)) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });

    // Update results count
    var totalEntries = allCards.length;
    if (!searchQuery && activeCategory === 'all') {
      resultsText.textContent = 'Showing all ' + totalEntries + ' entries';
    } else if (visibleCount === 0) {
      resultsText.textContent = 'No matching entries';
    } else {
      var parts = ['Showing ' + visibleCount + ' of ' + totalEntries + ' entries'];
      if (activeCategory !== 'all') {
        var activePill = document.querySelector('.pill[data-category="' + activeCategory + '"]');
        if (activePill) {
          parts.push('in ' + activePill.textContent);
        }
      }
      if (searchQuery) {
        parts.push('matching "' + searchQuery + '"');
      }
      resultsText.textContent = parts.join(' ');
    }

    // No results message
    if (visibleCount === 0) {
      noResults.style.display = 'block';
      mainContent.style.display = 'none';
    } else {
      noResults.style.display = 'none';
      mainContent.style.display = 'block';
    }
  }

  // === Clear filters ===
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      activeCategory = 'all';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      filterPills.forEach(function (p) { p.classList.remove('active'); });
      var allPill = document.querySelector('.pill[data-category="all"]');
      if (allPill) allPill.classList.add('active');
      showStatsBar();
      hideConfigPanel();
      applyFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // === Initialize ===
  applyFilters();

  // ============================================================
  // FULLSCREEN DIAGRAM MODE
  // ============================================================

  var fsOverlay = document.getElementById('fsOverlay');
  var fsLabel = document.getElementById('fsLabel');
  var fsDiagram = document.getElementById('fsDiagram');
  var fsCounter = document.getElementById('fsCounter');
  var fsPrev = document.getElementById('fsPrev');
  var fsNext = document.getElementById('fsNext');
  var fsClose = document.getElementById('fsClose');
  var diagramExpandBtn = document.getElementById('diagramExpandBtn');

  // Ordered list of category keys (matches pill order)
  var categoryKeys = [
    'auth', 'health', 'api', 'lb', 'kv', 'ha', 'iot',
    'cache', 'media', 'session-log', 'routing', 'tls',
    'tunnel', 'internal', 'stream-session', 'perf', 'proxy-proto'
  ];

  var fsCurrentIndex = 0;
  var fsIsOpen = false;

  function openFullscreen(category) {
    var idx = categoryKeys.indexOf(category);
    if (idx === -1) idx = 0;
    fsCurrentIndex = idx;
    renderFullscreenDiagram();
    fsOverlay.classList.add('active');
    fsIsOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreen() {
    fsOverlay.classList.remove('active');
    fsIsOpen = false;
    document.body.style.overflow = '';
  }

  function renderFullscreenDiagram() {
    var key = categoryKeys[fsCurrentIndex];
    var diagramFn = DIAGRAMS[key];
    var label = CATEGORY_LABELS[key] || key;

    fsLabel.textContent = label;
    fsDiagram.innerHTML = diagramFn ? diagramFn() : '<p style="color:#888;">No diagram</p>';
    fsCounter.textContent = (fsCurrentIndex + 1) + ' / ' + categoryKeys.length;
  }

  function fsNavigate(delta) {
    fsCurrentIndex = (fsCurrentIndex + delta + categoryKeys.length) % categoryKeys.length;
    renderFullscreenDiagram();

    // Also sync the main page to this category
    var key = categoryKeys[fsCurrentIndex];
    activeCategory = key;
    filterPills.forEach(function(p) { p.classList.remove('active'); });
    var pill = document.querySelector('.pill[data-category="' + key + '"]');
    if (pill) pill.classList.add('active');
    showHeroDiagram(key);
    showConfigPanel(key);
    applyFilters();
  }

  // Expand button click
  if (diagramExpandBtn) {
    diagramExpandBtn.addEventListener('click', function() {
      openFullscreen(activeCategory);
    });
  }

  // Close button
  if (fsClose) {
    fsClose.addEventListener('click', closeFullscreen);
  }

  // Nav buttons
  if (fsPrev) {
    fsPrev.addEventListener('click', function() { fsNavigate(-1); });
  }
  if (fsNext) {
    fsNext.addEventListener('click', function() { fsNavigate(1); });
  }

  // Click overlay backdrop to close
  if (fsOverlay) {
    fsOverlay.addEventListener('click', function(e) {
      if (e.target === fsOverlay) closeFullscreen();
    });
  }

  // Keyboard: ESC to close, arrows to navigate, F to toggle
  document.addEventListener('keydown', function(e) {
    if (fsIsOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFullscreen();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        fsNavigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        fsNavigate(1);
      } else if (e.key === 'f' || e.key === 'F') {
        // Only if not focused on an input
        if (document.activeElement !== searchInput && document.activeElement !== mobileSearchInput) {
          e.preventDefault();
          closeFullscreen();
        }
      }
    } else {
      // F key to open fullscreen if a diagram is visible
      if ((e.key === 'f' || e.key === 'F') && activeCategory !== 'all'
          && document.activeElement !== searchInput
          && document.activeElement !== mobileSearchInput) {
        e.preventDefault();
        openFullscreen(activeCategory);
      }
    }
  });

  // ============================================================
  // COPY CONFIG BUTTON
  // ============================================================
  var copyBtn = document.getElementById('configCopyBtn');
  var copyLabel = document.getElementById('configCopyLabel');
  var codeBlock = document.getElementById('configCodeBlock');

  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var text = codeBlock.textContent || codeBlock.innerText;
      navigator.clipboard.writeText(text).then(function() {
        copyBtn.classList.add('copied');
        copyLabel.textContent = 'Copied!';
        setTimeout(function() {
          copyBtn.classList.remove('copied');
          copyLabel.textContent = 'Copy';
        }, 2000);
      }).catch(function() {
        // Fallback for file:// protocol or older browsers
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyBtn.classList.add('copied');
        copyLabel.textContent = 'Copied!';
        setTimeout(function() {
          copyBtn.classList.remove('copied');
          copyLabel.textContent = 'Copy';
        }, 2000);
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // Footer version stamp — populated from the state file the
  // auto-updater maintains, so it always reflects the latest
  // NGINX Plus release we've ingested.
  // ──────────────────────────────────────────────────────────
  function populateFooterVersion() {
    var el = document.getElementById('footerVersionValue');
    if (!el) return;
    // version.txt is generated at deploy time by .github/workflows/deploy-pages.yml,
    // which copies skills/nginx-plus-guide-updater/state/last-seen-version.txt into
    // the published docs/ folder. Single source of truth: the state file the
    // auto-updater maintains.
    fetch('./version.txt', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function (text) {
        var v = (text || '').trim();
        if (v) el.textContent = v;
      })
      .catch(function () {
        // Quiet fallback — leaves the default "latest release" label in place.
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateFooterVersion);
  } else {
    populateFooterVersion();
  }

  // Easter egg: triple-click footer brand to thank the humans behind NGINX.
  function wireEasterEgg() {
    var brand = document.getElementById('footerBrand');
    var overlay = document.getElementById('eggOverlay');
    var closeBtn = document.getElementById('eggClose');
    if (!brand || !overlay) return;
    var clicks = 0, timer = null;
    function openEgg() { overlay.hidden = false; }
    function closeEgg() { overlay.hidden = true; }
    brand.addEventListener('click', function () {
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(function () { clicks = 0; }, 600);
      if (clicks >= 3) { clicks = 0; openEgg(); }
    });
    if (closeBtn) closeBtn.addEventListener('click', closeEgg);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeEgg(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeEgg(); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireEasterEgg);
  } else {
    wireEasterEgg();
  }

})();
