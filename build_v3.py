#!/usr/bin/env python3
"""Build v3.html from index.html: black+green dark theme, Neuenhaus details, new logo, burger drawer, ascii-reveal."""
import re, sys, pathlib
src = pathlib.Path("index.html").read_text()
out = src
def rep(old, new, count=1, regex=False):
    global out
    n = len(re.findall(old, out)) if regex else out.count(old)
    if n != count:
        print(f"!! expected {count} got {n}: {old[:70]!r}"); sys.exit(1)
    out = re.sub(old, new, out) if regex else out.replace(old, new)
    print(f"ok {n}: {old[:60]!r}")

# --- tokens: dark theme -> black + green
rep("--bg:#121212; --bg-2:#161616; --panel:#1b1b1b; --panel-2:#222; --panel-3:#2a2a2a;",
    "--bg:#0a0a0a; --bg-2:#0e0e0e; --panel:#121212; --panel-2:#181818; --panel-3:#202020;")
rep("--accent:#188f83; --accent-2:#0f6d63; --accent-hi:#2fc4b4; --accent-ink:#06201d; --accent-soft:#0c211f;",
    "--accent:#8aff3c; --accent-2:#6fd82c; --accent-hi:#8aff3c; --accent-ink:#071200; --accent-soft:#0f1d08;")
rep("--accent-glow:rgba(47,196,180,.22); --shadow:0 30px 80px rgba(0,0,0,.45);",
    "--accent-glow:rgba(138,255,60,.16); --shadow:0 30px 80px rgba(0,0,0,.55);")
rep("--dot:243,239,231; --dot-hi:47,196,180; --term-bg:#0b0b0b; --term-ink:#d8d8d4;",
    "--dot:237,237,234; --dot-hi:138,255,60; --term-bg:#050505; --term-ink:#d8d8d4;")
rep('<meta name="theme-color" content="#121212">', '<meta name="theme-color" content="#0a0a0a">')
rep("meta.content = root.dataset.theme==='light' ? '#f6f3ec' : '#121212';", "meta.content = root.dataset.theme==='light' ? '#f6f3ec' : '#0a0a0a';")

# --- fonts: drop Doto
rep("family=Doto:wght@700;900&", "")
rep("--dotf:'Doto',var(--mono);", "--dotf:var(--sans);")
rep("tctx.font=`900 ${fs}px Doto, monospace`;", "tctx.font=`800 ${fs}px Manrope, sans-serif`;")
rep("tctx.fillText('ZER0FILL',", "tctx.fillText('ZER0FILL',")
rep("const fs=Math.min(rows*0.55, cols*0.19);", "const fs=Math.min(rows*0.42, cols*0.115);")

# --- squarer geometry (Neuenhaus)
rep("--r:22px;", "--r:10px;")
rep("border-radius:999px;padding:0 22px;height:48px;", "border-radius:6px;padding:0 22px;height:48px;")
rep("border-radius:18px;padding:18px 16px 16px;min-height:150px;", "border-radius:8px;padding:18px 16px 16px;min-height:150px;")
rep("border-radius:14px;padding:12px 16px;cursor:pointer;font-weight:700;", "border-radius:6px;padding:12px 16px;cursor:pointer;font-weight:700;")
rep("border:1px solid var(--line);border-radius:999px;padding:8px 14px}", "border:1px solid var(--line);border-radius:4px;padding:8px 14px}")
rep(".theme{width:44px;height:44px;border-radius:50%;", ".theme{width:44px;height:44px;border-radius:6px;")

# --- logo: mark + plain ZEROFILL
rep(".brand .word{font-family:var(--dotf);font-weight:900;font-size:24px;letter-spacing:.06em;color:var(--ink)}\n  .brand .word b{color:var(--accent-hi);font-weight:900}",
    ".brand .word{font-family:var(--sans);font-weight:800;font-size:20px;letter-spacing:.18em;color:var(--ink)}\n"
    "  .brand .word b{color:var(--ink);font-weight:800}\n"
    "  .mark{width:26px;height:26px;flex:none}\n"
    "  .burger{width:44px;height:44px;border:1.5px solid var(--line-2);border-radius:6px;background:var(--panel);display:grid;place-items:center;cursor:pointer;flex:none}\n"
    "  .burger svg{width:20px;height:20px;stroke:var(--ink);fill:none;stroke-width:2;stroke-linecap:round}\n"
    "  .brand-l{display:flex;align-items:center;gap:12px}\n"
    "  .drawer{position:fixed;inset:0 auto 0 0;width:min(320px,86vw);background:var(--panel);border-right:1px solid var(--line-2);z-index:40;transform:translateX(-102%);transition:transform .28s ease;display:flex;flex-direction:column;padding:18px}\n"
    "  .drawer.open{transform:none}\n"
    "  .drawer .dh{display:flex;justify-content:space-between;align-items:center;height:44px;margin-bottom:18px}\n"
    "  .drawer a{display:grid;grid-template-columns:52px 1fr;align-items:center;gap:12px;padding:16px 12px;border-top:1px solid var(--line);font-weight:700;font-size:17px;min-height:56px}\n"
    "  .drawer a:last-of-type{border-bottom:1px solid var(--line)}\n"
    "  .drawer a .n{font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--muted)}\n"
    "  .drawer a:hover,.drawer a.on{background:var(--accent);color:var(--accent-ink)} .drawer a:hover .n,.drawer a.on .n{color:var(--accent-ink)}\n"
    "  .drawer .df{margin-top:auto;color:var(--muted);font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase}\n"
    "  .scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:39;opacity:0;pointer-events:none;transition:opacity .25s} .scrim.on{opacity:1;pointer-events:auto}\n"
    "  .xh{position:absolute;width:18px;height:18px;opacity:.5;pointer-events:none;z-index:1}\n"
    "  .xh::before,.xh::after{content:\"\";position:absolute;background:var(--ink)} .xh::before{left:8px;top:0;width:1px;height:18px} .xh::after{top:8px;left:0;height:1px;width:18px}\n"
    "  .strip{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:14px var(--gutter);border-bottom:1px solid var(--line);font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);overflow:auto;white-space:nowrap}\n"
    "  .strip b{color:var(--ink);font-weight:600;margin-right:8px} .strip .ar{color:var(--accent-hi)}\n"
    "  .h1{text-transform:uppercase}\n"
    "  .nav-links a.on{color:var(--accent-ink);background:var(--accent);padding:6px 10px;border-radius:4px}")
MARK = ('<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><defs><mask id="zm{ID}"><rect width="100" height="100" fill="#fff"/>'
        '<line x1="18" y1="82" x2="82" y2="18" stroke="#000" stroke-width="22" stroke-linecap="round"/></mask></defs>'
        '<circle cx="50" cy="50" r="36" fill="none" stroke="var(--accent-hi)" stroke-width="14" mask="url(#zm{ID})"/>'
        '<line x1="18" y1="82" x2="82" y2="18" stroke="var(--ink)" stroke-width="10" stroke-linecap="round"/></svg>')
rep('<a class="brand" href="#top" aria-label="ZeroFill Tech home"><span class="word">ZER<b>0</b>FILL</span></a>',
    '<div class="brand-l"><button class="burger" id="burger" aria-label="Open menu" aria-controls="drawer" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>'
    '<a class="brand" href="#top" aria-label="ZeroFill Tech home">' + MARK.replace("{ID}", "a") + '<span class="word">ZER0FILL</span></a></div>')
rep('<div class="word">ZER<b>0</b>FILL TECH</div>', '<div class="word" style="display:flex;align-items:center;gap:10px">' + MARK.replace("{ID}", "b") + 'ZER0FILL TECH</div>')

# --- hero copy
rep('<h1 class="h1">We haul off your old tech. <em>Free.</em></h1>',
    '<h1 class="h1">Free pickup.<br>Certified <em>wipe</em>.<br>Nothing left.</h1>\n'
    '  <i class="xh" style="right:24px;top:24px"></i><i class="xh" style="right:24px;bottom:24px"></i><i class="xh" style="left:24px;bottom:24px"></i>')
rep('<p class="lede">Free e-waste removal and electronics recycling across the Las Vegas valley. Computers, laptops, monitors, servers — <b>we pick them up</b>, wipe every drive, and give what\'s still good a second life. You get a clean garage and a clear conscience.</p>',
    '<p class="lede">We haul off old computers, laptops, monitors and servers across the Las Vegas valley for free, <b>wipe every drive to NIST 800-88</b>, and give what\'s still good a second life.</p>')
rep('<span class="kicker">Las Vegas e-waste pickup · Free</span>', '<span class="kicker">Las Vegas · NV &nbsp;·&nbsp; Accepting pickups</span>')
rep("  .nav .callnum{display:none}", "  .nav .callnum{display:none}\n  @media (max-width:479px){.nav .calltxt{display:none}.nav .callbtn{padding:0;width:44px}}")
# process strip after hero
rep('</section>\n\n<!-- BOOKING -->',
    '</section>\n<div class="strip" aria-label="Process"><span><b>01</b> Collect</span><span class="ar">→</span><span><b>02</b> Wipe</span><span class="ar">→</span><span><b>03</b> Certify</span><span class="ar">→</span><span><b>04</b> Resell or recycle</span></div>\n\n<!-- BOOKING -->')

# --- drawer markup + ascii-reveal after <body>
rep('<body>\n\n<header>',
    '<body>\n<div class="scrim" id="scrim"></div>\n<aside class="drawer" id="drawer" aria-label="Menu" data-ascii="skip">\n'
    '  <div class="dh"><span class="mono">Menu</span><button class="burger" id="dclose" aria-label="Close menu"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>\n'
    '  <a href="#book"><span class="n">01</span>Book a pickup</a><a href="#services"><span class="n">02</span>Services</a><a href="#purge"><span class="n">03</span>PURGE wipe</a>'
    '<a href="#business"><span class="n">04</span>Businesses</a><a href="#take"><span class="n">05</span>What we take</a><a href="#how"><span class="n">06</span>How it works</a>'
    '<a href="/sale.html"><span class="n">07</span>For sale</a><a href="#faq"><span class="n">08</span>FAQ</a>\n'
    '  <div class="df">ZeroFill Tech · Las Vegas NV<br>(702) 760-5037</div>\n</aside>\n\n<header>')
rep("root.dataset.theme = saved || sys;", "root.dataset.theme = new URLSearchParams(location.search).get('theme') || saved || sys;")
rep("@media (min-width:1280px){.nav-links a.opt{display:inline}}", "@media (min-width:1400px){.nav-links a.opt{display:inline}}")
rep("font-size:20px;letter-spacing:.18em;color:var(--ink)}", "font-size:19px;letter-spacing:.14em;color:var(--ink)}")
# skip wizard from reveal (interactive), add module script before </body>
rep('<section class="book" id="book"><div class="wrap">', '<section class="book" id="book" data-ascii="skip"><div class="wrap">')
rep('<canvas id="dots" aria-hidden="true"></canvas>', '<canvas id="dots" aria-hidden="true" data-ascii="skip"></canvas>')
rep('</body>',
    '<script type="module">\n'
    'import { createAsciiReveal } from "/proto/vendor/ascii-reveal-core.js";\n'
    'const d=document.getElementById("drawer"),s=document.getElementById("scrim"),b=document.getElementById("burger");\n'
    'const open=o=>{d.classList.toggle("open",o);s.classList.toggle("on",o);b.setAttribute("aria-expanded",o);};\n'
    'b.onclick=()=>open(true);document.getElementById("dclose").onclick=()=>open(false);s.onclick=()=>open(false);\n'
    'addEventListener("keydown",e=>{if(e.key==="Escape")open(false)});\n'
    'const reveal=createAsciiReveal(document.querySelector("main"),{preset:"terminal",duration:"fast",origin:"top-left",media:"img,[data-ascii=media]",lazy:true});\n'
    'd.querySelectorAll("a[href^=\'#\']").forEach(a=>a.onclick=e=>{open(false);const sec=document.querySelector(a.getAttribute("href"));if(sec)setTimeout(()=>reveal.reveal({within:sec,origin:"top-left",speed:1.4}),350);});\n'
    '</script>\n</body>')

# check tiles -> accent green with dark check (light theme keeps a readable green)
rep(".list h3 .dotk{width:12px;height:12px;border-radius:50%;background:#1f8a5b}", ".list h3 .dotk{width:12px;height:12px;border-radius:50%;background:var(--ok,#1f8a5b)}")
rep("border-radius:7px;margin-top:1px;background-color:#1f8a5b;", "border-radius:6px;margin-top:1px;background-color:var(--ok,#1f8a5b);")
rep("stroke='white' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'", "stroke='%23071200' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'")
rep("--dot:237,237,234; --dot-hi:138,255,60;", "--ok:#8aff3c; --dot:237,237,234; --dot-hi:138,255,60;")
rep("--dot:23,21,15; --dot-hi:217,160,0;", "--ok:#2e9e5c; --dot:23,21,15; --dot-hi:217,160,0;")
rep("[data-theme=\"light\"] .err{color:#b3261e}", "[data-theme=\"light\"] .err{color:#b3261e}\n  [data-theme=\"light\"] .list li::before{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E\")}\n  [data-theme=\"light\"] .list.no li::before{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.2' stroke-linecap='round'%3E%3Cpath d='M6 6l12 12M18 6 6 18'/%3E%3C/svg%3E\")}")
pathlib.Path("v3.html").write_text(out)
print("wrote v3.html", len(out))
