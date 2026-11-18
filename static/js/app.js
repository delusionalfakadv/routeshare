// RouteShare Frontend Application Logic

let map = null;
let pts = [];
let layers = [];
let curUser = null;
let isSign = false;
let activeTable = 'rides';
let allRecords = {};

function initMap() {
    if (map) return;
    map = L.map('map').setView([28.6139, 77.2090], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', e => {
        if (pts.length >= 2) clearMap();
        const pt = { lat: +e.latlng.lat.toFixed(4), lng: +e.latlng.lng.toFixed(4) };
        pts.push(pt);
        layers.push(L.marker([pt.lat, pt.lng]).addTo(map));

        if (pts.length === 1) {
            document.getElementById('pt1').innerText = `${pt.lat}, ${pt.lng}`;
            document.getElementById('clickHint').innerText = "1 point set. Click point 2.";
        } else if (pts.length === 2) {
            document.getElementById('pt2').innerText = `${pt.lat}, ${pt.lng}`;
            const isD = curUser && curUser.role === 'driver';
            layers.push(
                L.polyline(pts.map(p => [p.lat, p.lng]), {
                    color: isD ? '#2563eb' : '#059669',
                    weight: 4
                }).addTo(map)
            );
            document.getElementById('clickHint').innerText = isD ? "Ready to publish!" : "Ready to find match!";
        }
    });
}

function clearMap() {
    pts = [];
    layers.forEach(l => map.removeLayer(l));
    layers = [];
    document.getElementById('pt1').innerText = "Not selected";
    document.getElementById('pt2').innerText = "Not selected";
}

function showPage(pageId) {
    ['mapPage', 'driverPage', 'riderPage', 'analyticsPage', 'dbPage'].forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.toggle('hidden', p !== pageId);
    });

    ['navMap', 'navDriver', 'navRider', 'navAnalytics', 'navDb'].forEach(b => {
        const btn = document.getElementById(b);
        if (!btn) return;
        const isCur =
            (pageId === 'mapPage' && b === 'navMap') ||
            (pageId === 'driverPage' && b === 'navDriver') ||
            (pageId === 'riderPage' && b === 'navRider') ||
            (pageId === 'analyticsPage' && b === 'navAnalytics') ||
            (pageId === 'dbPage' && b === 'navDb');
        btn.className = isCur
            ? "px-3 py-1 rounded-lg bg-white text-indigo-700 font-bold shadow-sm"
            : "px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900";
    });

    if (pageId === 'mapPage') {
        setTimeout(() => map && map.invalidateSize(), 150);
    } else if (pageId === 'analyticsPage') {
        loadAnalytics();
    } else if (pageId === 'dbPage') {
        loadDbInspector();
    }
}

function setTab(s) {
    isSign = s;
    document.getElementById('tLogin').className = s
        ? 'flex-1 pb-2 text-slate-400'
        : 'flex-1 pb-2 border-b-2 border-indigo-600 text-indigo-600 font-bold';
    document.getElementById('tSignup').className = s
        ? 'flex-1 pb-2 border-b-2 border-indigo-600 text-indigo-600 font-bold'
        : 'flex-1 pb-2 text-slate-400';
    document.getElementById('r').classList.toggle('hidden', !s);
    document.getElementById('btnAuth').innerText = s ? 'Create Account' : 'Log In';
}

function fill(u, p, r) {
    document.getElementById('u').value = u;
    document.getElementById('p').value = p;
    document.getElementById('r').value = r;
    doAuth();
}

async function doAuth(e) {
    if (e) e.preventDefault();
    const u = document.getElementById('u').value.trim();
    const p = document.getElementById('p').value;
    const r = document.getElementById('r').value;

    try {
        const res = await (await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p, role: r, is_signup: isSign })
        })).json();

        if (!res.success) {
            if (!isSign && res.error && res.error.includes('credentials')) {
                const reg = await (await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p, role: r, is_signup: true })
                })).json();
                if (reg.success) {
                    curUser = reg.user;
                    finishAuth();
                    return;
                }
            }
            const errEl = document.getElementById('err');
            errEl.innerText = res.error || 'Authentication failed';
            errEl.classList.remove('hidden');
            return;
        }

        curUser = res.user;
        finishAuth();
    } catch (err) {
        console.error('Auth error:', err);
    }
}

function finishAuth() {
    localStorage.setItem('rs_u', JSON.stringify(curUser));
    document.getElementById('authModal').classList.add('hidden');
    applyUserUI();
}

function logout() {
    localStorage.removeItem('rs_u');
    curUser = null;
    document.getElementById('userBadge').classList.add('hidden');
    document.getElementById('userBadge').classList.remove('flex');
    document.getElementById('authModal').classList.remove('hidden');
}

function toggleRole() {
    if (!curUser) return;
    curUser.role = curUser.role === 'driver' ? 'rider' : 'driver';
    localStorage.setItem('rs_u', JSON.stringify(curUser));
    applyUserUI();
}

function applyUserUI() {
    if (!curUser) return;
    document.getElementById('uName').innerText = curUser.username;
    document.getElementById('uRole').innerText = curUser.role;
    document.getElementById('userBadge').classList.remove('hidden');
    document.getElementById('userBadge').classList.add('flex');

    const isD = curUser.role === 'driver';
    document.getElementById('modeTitle').innerText = isD ? 'Driver Route Planner' : 'Rider Commute Search';
    document.getElementById('btnAction').innerText = isD ? 'Publish Route to Network' : 'Find Overlapping Drivers';
    document.getElementById('btnAction').className = isD
        ? "w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
        : "w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow";

    initMap();
    loadFeed();
}

async function handleMapAction() {
    if (pts.length < 2) return alert('Please click 2 points on the map first!');
    const isD = curUser && curUser.role === 'driver';

    if (isD) {
        await fetch('/api/driver/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: curUser.username,
                vehicle: 'Car',
                seats: 3,
                time: '09:00 AM',
                origin_name: 'Custom Start',
                dest_name: 'Custom Dest',
                start: pts[0],
                end: pts[1]
            })
        });
        alert('✅ Driver route registered in SQLite!');
        clearMap();
        loadFeed();
    } else {
        const res = await (await fetch('/api/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pickup: pts[0], dropoff: pts[1] })
        })).json();

        if (res.matched && res.matches && res.matches.length) {
            const best = res.matches[0];
            window.currentBest = best;
            document.getElementById('overlapBadge').innerText = `${best.overlap_pct}% Overlap`;
            document.getElementById('matchDetails').innerHTML = `
                <div class="flex justify-between"><span>Driver:</span> <b>${best.driver_name} (${best.vehicle})</b></div>
                <div class="flex justify-between"><span>Time:</span> <b>${best.time}</b></div>
                <div class="flex justify-between"><span>Route:</span> <b>${best.origin_name} ➔ ${best.dest_name}</b></div>
                <div class="flex justify-between"><span>Detour:</span> <b class="text-indigo-700">+${best.detour_km} km</b></div>
                <div class="flex justify-between"><span>Fare:</span> <b class="text-emerald-700">₹${best.fare}</b> <s class="text-slate-400">₹${best.uber_price}</s></div>
            `;
            document.getElementById('matchCard').classList.remove('hidden');
        } else {
            alert('No overlapping driver within maximum detour tolerance (4 km).');
        }
    }
}

async function confirmBooking() {
    if (!window.currentBest) return;
    const b = window.currentBest;
    await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            rider: curUser.username,
            driver: b.driver_name,
            origin_name: b.origin_name,
            dest_name: b.dest_name,
            fare: b.fare,
            detour: b.detour_km
        })
    });
    alert('🎉 Seat requested in SQLite!');
    document.getElementById('matchCard').classList.add('hidden');
    loadFeed();
}

async function testQuickMatch() {
    clearMap();
    pts = [{ lat: 28.5921, lng: 77.1610 }, { lat: 28.6289, lng: 77.2065 }];
    pts.forEach(p => layers.push(L.marker([p.lat, p.lng]).addTo(map)));
    layers.push(L.polyline(pts.map(p => [p.lat, p.lng]), { color: '#059669', weight: 4 }).addTo(map));
    document.getElementById('pt1').innerText = "28.5921, 77.1610 (Dhaula Kuan)";
    document.getElementById('pt2').innerText = "28.6289, 77.2065 (Shivaji Stadium)";
    map.fitBounds([[28.4950, 77.0890], [28.6315, 77.2167]], { padding: [30, 30] });
    handleMapAction();
}

async function loadFeed() {
    try {
        const res = await fetch('/api/records');
        const data = await res.json();
        allRecords = data;

        document.getElementById('driverCount').innerText = `${data.driver_routes.length} Drivers`;
        document.getElementById('driverList').innerHTML = data.driver_routes.map(d => `
            <div class="p-2.5 bg-slate-50 border rounded-lg hover:border-indigo-400 cursor-pointer transition"
                 onclick="highlightRoute(${d.s_lat},${d.s_lng},${d.e_lat},${d.e_lng},'${d.driver_name}')">
                <div class="flex justify-between items-center font-bold text-slate-800">
                    <span>🚘 ${d.driver_name}</span>
                    <span class="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">${d.time}</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">${d.origin_name} ➔ ${d.dest_name}</div>
                <div class="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>${d.vehicle} • ${d.seats} seats</span>
                    <span class="text-indigo-600 font-semibold">Click to show</span>
                </div>
            </div>
        `).join('');

        document.getElementById('ridesFeed').innerHTML = data.rides.map(r => `
            <div class="p-2.5 bg-slate-50 border rounded-xl flex justify-between items-center">
                <div>
                    <div class="font-bold text-slate-800">🙋 ${r.rider_name} ➔ 🚘 ${r.driver_name}</div>
                    <div class="text-[11px] text-slate-500">${r.origin_name} to ${r.dest_name}</div>
                    <div class="text-[10px] text-slate-400">₹${r.fare} • +${r.detour_km} km • CO₂: -${r.co2_saved} kg</div>
                </div>
                <div class="flex items-center gap-1">
                    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        r.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'Accepted' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }">${r.status}</span>
                    ${r.status === 'Pending' ? `<button onclick="setRideStatus(${r.id},'Accepted')" class="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold">Accept</button>` : ''}
                    ${r.status === 'Accepted' ? `<button onclick="setRideStatus(${r.id},'Completed')" class="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">Done</button>` : ''}
                </div>
            </div>
        `).join('');

        document.getElementById('driverTable').innerHTML = data.driver_routes.map(d => `
            <div class="p-2.5 bg-slate-50 border rounded-xl flex justify-between items-center">
                <div>
                    <div class="font-bold text-slate-800">${d.driver_name} · <span class="text-slate-500 font-normal">${d.vehicle}</span></div>
                    <div class="text-slate-500 text-[11px]">${d.origin_name} ➔ ${d.dest_name} (${d.time})</div>
                </div>
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">${d.seats} Seats Free</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Feed loading error:', err);
    }
}

function highlightRoute(s1, s2, e1, e2, name) {
    clearMap();
    layers.push(L.marker([s1, s2]).addTo(map).bindPopup(`${name} Start`).openPopup());
    layers.push(L.marker([e1, e2]).addTo(map).bindPopup(`${name} End`));
    layers.push(L.polyline([[s1, s2], [e1, e2]], { color: '#2563eb', weight: 4 }).addTo(map));
    map.fitBounds([[s1, s2], [e1, e2]], { padding: [30, 30] });
}

async function setRideStatus(id, status) {
    await fetch('/api/ride/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    loadFeed();
}

async function submitDriverRoute(e) {
    e.preventDefault();
    await fetch('/api/driver/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: curUser ? curUser.username : "Rahul",
            vehicle: document.getElementById('dVehicle').value,
            seats: parseInt(document.getElementById('dSeats').value),
            time: document.getElementById('dTime').value,
            origin_name: document.getElementById('dOrigin').value,
            dest_name: document.getElementById('dDest').value,
            start: { lat: 28.5200, lng: 77.1000 },
            end: { lat: 28.6300, lng: 77.2200 }
        })
    });
    alert('🎉 Journey published into SQLite network!');
    showPage('mapPage');
    loadFeed();
}

async function loadAnalytics() {
    try {
        const res = await (await fetch('/api/analytics')).json();
        document.getElementById('kpiCo2').innerText = `${res.co2_saved_kg} kg`;
        document.getElementById('kpiMoney').innerText = `₹${res.money_saved_inr}`;
        document.getElementById('kpiDrivers').innerText = res.active_drivers;
        document.getElementById('kpiEff').innerText = res.efficiency;
    } catch (err) {
        console.error('Analytics load error:', err);
    }
}

async function loadDbInspector() {
    try {
        const data = await (await fetch('/api/records')).json();
        allRecords = data;
        inspectTable(activeTable);
    } catch (err) {
        console.error('DB Inspector error:', err);
    }
}

function inspectTable(tName) {
    activeTable = tName;
    ['btnTabRides', 'btnTabDrivers', 'btnTabUsers'].forEach(b => {
        const btn = document.getElementById(b);
        if (!btn) return;
        const isCur =
            (tName === 'rides' && b === 'btnTabRides') ||
            (tName === 'driver_routes' && b === 'btnTabDrivers') ||
            (tName === 'users' && b === 'btnTabUsers');
        btn.className = isCur
            ? "px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-bold"
            : "px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold";
    });

    const rows = allRecords[tName] || [];
    const out = document.getElementById('tableOutput');
    if (!rows.length) {
        out.innerHTML = '<div class="p-3 text-slate-400">No records found.</div>';
        return;
    }
    const cols = Object.keys(rows[0]);
    out.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-100 border-b">
                <tr>${cols.map(c => `<th class="p-2 font-bold uppercase text-[10px] text-slate-600">${c}</th>`).join('')}</tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                ${rows.map(r => `<tr>${cols.map(c => `<td class="p-2 text-slate-700">${r[c]}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function resetAll() {
    clearMap();
    await fetch('/api/reset', { method: 'POST' });
    loadFeed();
    alert('Database reset & re-seeded with demo data!');
}

// On page load
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('rs_u');
    if (saved) {
        try {
            curUser = JSON.parse(saved);
            applyUserUI();
        } catch (e) {
            console.error('Error parsing stored user:', e);
        }
    }
    initMap();
    loadFeed();
    setInterval(loadFeed, 6000);
});
