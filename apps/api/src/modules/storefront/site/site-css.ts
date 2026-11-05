// Estilo do site público (sem framework: a página chega pronta do servidor e abre rápido no celular).
// A cor da loja vem em --accent; os tons claros saem dela com color-mix.
export const SITE_CSS = `
:root{--ink:#1d1820;--muted:#76697a;--line:#eee5ea;--bg:#fcfafb;--card:#fff;
--soft:color-mix(in srgb,var(--accent) 9%,#fff);--soft2:color-mix(in srgb,var(--accent) 18%,#fff);
--deep:color-mix(in srgb,var(--accent) 80%,#000);--radius:18px;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg)}
a{color:inherit}img{display:block;max-width:100%}button{font:inherit}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}@media(min-width:720px){.wrap{padding:0 28px}}
.preview{background:#fef3c7;color:#78350f;text-align:center;font-size:14px;padding:8px 16px}
.announce{background:var(--accent);color:#fff;text-align:center;font-size:13px;font-weight:600;letter-spacing:.02em;padding:8px 16px}

/* topo */
.top{position:sticky;top:0;z-index:20;background:rgba(252,250,251,.86);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;gap:20px;height:68px}
.brand{font:600 24px/1 var(--serif);text-decoration:none;letter-spacing:.01em;white-space:nowrap}
.nav{display:none;gap:22px;margin-left:12px;font-size:14px;font-weight:500}
.nav a{text-decoration:none;color:var(--muted);transition:color .2s}.nav a:hover,.nav a.on{color:var(--ink)}
@media(min-width:900px){.nav{display:flex}}
.top-actions{margin-left:auto;display:flex;align-items:center;gap:6px}
.icon-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;border:0;background:transparent;color:inherit;cursor:pointer;transition:background .2s}
.icon-btn:hover{background:var(--soft)}
.icon-btn svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.count{position:absolute;top:3px;right:1px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:var(--accent);color:#fff;font:700 11px/19px system-ui;text-align:center;box-shadow:0 0 0 2px var(--bg)}
.count.pop{animation:pop .45s ease}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.45)}100%{transform:scale(1)}}

/* botões */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:12px 26px;border-radius:999px;
background:var(--ink);color:#fff;font-weight:650;font-size:15px;letter-spacing:.01em;text-decoration:none;border:0;cursor:pointer;
transition:transform .15s ease,box-shadow .2s ease,background .2s ease}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -10px rgba(29,24,32,.5)}
.btn:active{transform:translateY(0)}
.btn.accent{background:var(--accent)}.btn.accent:hover{box-shadow:0 12px 26px -10px var(--accent)}
.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}.btn.ghost:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
.btn.wa{background:#25d366}.btn.wide{width:100%}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.btn svg{width:20px;height:20px;fill:currentColor}

/* capa */
.hero{display:grid;gap:28px;align-items:center;padding:36px 0 28px}
@media(min-width:900px){.hero{grid-template-columns:1.05fr 1fr;padding:56px 0 40px;gap:48px}}
.eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.hero h1{font:600 clamp(38px,7vw,68px)/1.02 var(--serif);margin:0 0 16px;letter-spacing:-.01em}
.hero p.lead{font-size:clamp(16px,2vw,19px);color:var(--muted);max-width:520px;margin:0 0 26px}
.hero .ctas{display:flex;flex-wrap:wrap;gap:12px}
.mosaic{position:relative;display:grid;grid-template-columns:1.2fr 1fr;grid-template-rows:1fr 1fr;gap:12px;aspect-ratio:5/4}
.mosaic .ph{border-radius:22px;aspect-ratio:auto;height:100%}
.mosaic .ph:first-child{grid-row:1/3}
.mosaic.solo{grid-template-columns:1fr;grid-template-rows:1fr}
.blob{aspect-ratio:5/4;border-radius:32px;background:radial-gradient(circle at 30% 30%,var(--soft2),transparent 60%),radial-gradient(circle at 75% 70%,var(--soft),transparent 55%),var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font:600 64px var(--serif);color:var(--accent)}

/* vantagens */
.perks{display:grid;gap:10px;margin:8px 0 40px}
@media(min-width:720px){.perks{grid-template-columns:repeat(3,1fr)}}
.perk{display:flex;gap:12px;align-items:center;padding:16px 18px;border-radius:16px;background:var(--card);border:1px solid var(--line)}
.perk i{flex:0 0 40px;height:40px;border-radius:12px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:19px}
.perk b{display:block;font-size:14px}.perk span{font-size:13px;color:var(--muted)}

/* seções e vitrine */
.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:8px 0 18px}
.section-head h2{font:600 clamp(26px,4vw,36px)/1.1 var(--serif);margin:0}
.chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 4px;margin:0 0 22px}
.chips::-webkit-scrollbar{display:none}
.chips a,.chips button{flex:0 0 auto;padding:9px 18px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);text-decoration:none;font-size:14px;font-weight:550;cursor:pointer;color:inherit;transition:all .2s}
.chips a:hover,.chips button:hover:not(:disabled){border-color:var(--ink)}
.chips .on{background:var(--ink);border-color:var(--ink);color:#fff}
.chips button:disabled{opacity:.4;text-decoration:line-through;cursor:not-allowed}
.grid{list-style:none;padding:0;margin:0 0 64px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 14px}
@media(min-width:720px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:40px 22px}}
@media(min-width:1080px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.card a{text-decoration:none;display:block}
.ph{position:relative;aspect-ratio:4/5;border-radius:var(--radius);overflow:hidden;background:var(--soft);display:flex;align-items:center;justify-content:center}
.ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .45s ease,transform .7s ease}
.ph .alt{opacity:0}
.card:hover .ph .alt{opacity:1}.card:hover .ph img{transform:scale(1.04)}
.ph span{font:600 52px var(--serif);color:color-mix(in srgb,var(--accent) 40%,#fff)}
.sold .ph img{filter:grayscale(.6);opacity:.65}
.badges{position:absolute;left:10px;top:10px;display:flex;flex-direction:column;gap:6px;z-index:1}
.badge{display:inline-block;background:#fff;color:var(--ink);border-radius:999px;padding:3px 11px;font:700 11.5px/1.7 system-ui;letter-spacing:.02em;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.badge.off{background:var(--accent);color:#fff}.badge.hot{background:#fff4e5;color:#9a3412}
.quick{position:absolute;left:10px;right:10px;bottom:10px;z-index:1;padding:11px;border-radius:999px;background:rgba(255,255,255,.94);text-align:center;font-size:13px;font-weight:650;opacity:0;transform:translateY(8px);transition:all .25s ease}
.card:hover .quick{opacity:1;transform:none}
@media(hover:none){.quick{display:none}}
.name{margin:12px 0 2px;font-size:15px;font-weight:500}
.price{margin:0;font-weight:700;font-size:15px}
.was{color:var(--muted);font-weight:400;margin-right:6px;text-decoration-thickness:1px}
.empty{text-align:center;color:var(--muted);padding:56px 0}

/* sobre */
.about{max-width:720px;margin:0 auto 72px;text-align:center;color:#4a4150;padding:40px 24px;border-radius:28px;background:var(--soft)}
.about h2{font:600 30px var(--serif);color:var(--ink);margin:0 0 12px}

/* produto */
.crumbs{font-size:13px;color:var(--muted);padding:18px 0}.crumbs a{text-decoration:none}.crumbs a:hover{color:var(--ink)}
.product{display:grid;gap:28px;margin-bottom:72px}
@media(min-width:900px){.product{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:56px;align-items:start}.info{position:sticky;top:92px}}
.gallery .main{aspect-ratio:4/5}
.gallery .arrow{position:absolute;top:50%;z-index:2;width:42px;height:42px;margin-top:-21px;border-radius:999px;border:0;background:rgba(255,255,255,.92);cursor:pointer;font-size:20px;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.gallery .arrow.prev{left:12px}.gallery .arrow.next{right:12px}
.thumbs{display:flex;gap:10px;margin-top:12px;overflow-x:auto;scrollbar-width:none}
.thumbs button{flex:0 0 72px;height:90px;padding:0;border:2px solid transparent;border-radius:12px;overflow:hidden;background:var(--soft);cursor:pointer;opacity:.7;transition:all .2s}
.thumbs button.on{border-color:var(--ink);opacity:1}.thumbs img{width:100%;height:100%;object-fit:cover}
.info h1{font:600 clamp(30px,4.5vw,44px)/1.08 var(--serif);margin:0 0 10px}
.price.big{font-size:26px;margin:0 0 6px;display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px}
.saving{font-size:13px;font-weight:700;color:var(--accent);background:var(--soft);padding:3px 10px;border-radius:999px}
.urgency{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:#b45309;margin:4px 0 0}
.urgency:before{content:"";width:8px;height:8px;border-radius:999px;background:#f59e0b;animation:pulse 1.6s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.label{margin:22px 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
.label b{color:var(--ink);text-transform:none;letter-spacing:0;font-size:14px;margin-left:6px}
.opts .chips{flex-wrap:wrap;overflow:visible;margin:0}
.opts #sizes button{min-width:52px}
.buy{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-top:24px}
.qty-box{display:flex;align-items:center;border:1.5px solid var(--line);border-radius:999px;height:50px}
.qty-box button{width:44px;height:100%;border:0;background:none;font-size:20px;cursor:pointer;color:var(--ink)}
.qty-box span{min-width:26px;text-align:center;font-weight:700}
.warn{color:#9f1239;font-weight:600}
.trust{list-style:none;padding:18px 0 0;margin:22px 0 0;border-top:1px solid var(--line);display:grid;gap:10px;font-size:14px;color:#4a4150}
.trust li{display:flex;gap:10px;align-items:center}
.desc{color:#4a4150;margin-top:20px}.desc p{margin:0 0 10px}
details.more{border-top:1px solid var(--line);padding:14px 0}details.more summary{cursor:pointer;font-weight:650;list-style:none;display:flex;justify-content:space-between}
details.more summary:after{content:"+";font-size:20px;line-height:1}details.more[open] summary:after{content:"–"}
.buybar{position:fixed;left:0;right:0;bottom:0;z-index:15;display:flex;align-items:center;gap:12px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-top:1px solid var(--line);transform:translateY(110%);transition:transform .3s ease}
.buybar.show{transform:none}.buybar .p{font-weight:700;flex:1}.buybar .btn{min-height:46px;padding:10px 22px}
@media(min-width:900px){.buybar{display:none}}

/* sacola lateral (popup ao adicionar) */
.overlay{position:fixed;inset:0;z-index:40;background:rgba(29,24,32,.38);opacity:0;pointer-events:none;transition:opacity .3s}
.overlay.open{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;z-index:41;width:min(420px,100%);background:var(--card);display:flex;flex-direction:column;transform:translateX(105%);transition:transform .38s cubic-bezier(.2,.8,.2,1);box-shadow:-20px 0 50px -20px rgba(0,0,0,.3)}
.drawer.open{transform:none}
.drawer header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line)}
.drawer header b{font:600 22px var(--serif)}
.drawer .added{margin:14px 20px 0;padding:12px 14px;border-radius:14px;background:#ecfdf5;color:#047857;font-weight:600;font-size:14px;display:flex;gap:8px;align-items:center}
.drawer .list{flex:1;overflow:auto;padding:4px 20px}
.drawer footer{padding:16px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line);display:grid;gap:10px}
.drawer .sum{display:flex;justify-content:space-between;font-size:16px}.drawer .sum b{font-size:19px}
.line{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:center}
.line .ph{aspect-ratio:4/5;border-radius:12px}
.line .n{font-weight:600;font-size:14px;text-decoration:none;display:block}.line .v{font-size:13px;color:var(--muted)}
.line .pr{font-weight:700;font-size:14px;white-space:nowrap}
.mini-qty{display:flex;align-items:center;gap:6px;margin-top:6px}
.mini-qty button{width:28px;height:28px;border-radius:999px;border:1px solid var(--line);background:#fff;cursor:pointer}
.mini-qty .rm{width:auto;border:0;background:none;color:#9f1239;font-size:12.5px;text-decoration:underline;margin-left:6px}

/* sacola e finalizar */
.steps{display:flex;justify-content:center;gap:8px;margin:28px 0 8px;font-size:13px;font-weight:600;color:var(--muted)}
.steps span{display:flex;align-items:center;gap:8px}.steps span:not(:last-child):after{content:"";width:28px;height:1.5px;background:var(--line)}
.steps .on{color:var(--ink)}.steps i{width:22px;height:22px;border-radius:999px;background:var(--line);color:var(--muted);font-style:normal;display:inline-flex;align-items:center;justify-content:center;font-size:12px}
.steps .on i{background:var(--accent);color:#fff}
.page-title{font:600 clamp(32px,5vw,46px)/1.1 var(--serif);text-align:center;margin:8px 0 28px}
.cart{display:grid;gap:28px;margin-bottom:80px}@media(min-width:900px){.cart{grid-template-columns:minmax(0,1fr) 420px;align-items:start}}
.panel{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px}
.bag-total{display:flex;justify-content:space-between;align-items:baseline;font-size:17px;margin-top:16px}.bag-total strong{font-size:22px}
.checkout h2,.done h2{font:600 26px var(--serif);margin:0 0 6px}
.muted{color:var(--muted);font-size:14px;margin:0}
.field{display:block;margin-top:14px;font-size:13px;font-weight:650}
.field input,.field textarea{display:block;width:100%;margin-top:6px;padding:13px 15px;border:1.5px solid var(--line);border-radius:14px;font:inherit;font-weight:400;background:#fff;transition:border-color .2s,box-shadow .2s}
.field input:focus,.field textarea:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 4px var(--soft)}
.two{display:grid;gap:0 12px}@media(min-width:520px){.two{grid-template-columns:1fr 1fr}}
.check{display:flex;gap:10px;align-items:flex-start;font-size:14px;margin:16px 0}.check input{margin-top:3px;width:18px;height:18px;accent-color:var(--accent)}
.notice{background:var(--soft);border-radius:14px;padding:12px 14px;font-size:14px;color:#4a4150;margin:16px 0 0}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.done{text-align:center}
.done .tick{width:76px;height:76px;margin:6px auto 16px;border-radius:999px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;animation:pop .6s ease}
.done .tick svg{width:40px;height:40px;fill:none;stroke:#059669;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:draw .6s .25s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.ok{color:#047857;font-size:14px}
.text-left{text-align:left}.text-left h1{font:600 34px var(--serif)}

/* rodapé e flutuantes */
.foot{border-top:1px solid var(--line);padding:40px 0 calc(48px + env(safe-area-inset-bottom));color:var(--muted);font-size:14px;background:var(--card)}
.foot .wrap{display:grid;gap:18px}@media(min-width:720px){.foot .wrap{grid-template-columns:1.4fr 1fr}}
.foot .brand{font-size:22px;color:var(--ink)}.foot p{margin:6px 0 0;max-width:420px}
.foot nav{display:flex;flex-wrap:wrap;gap:10px 22px;align-content:start}.foot nav a{text-decoration:none}.foot nav a:hover{color:var(--ink)}
.wa-float{position:fixed;right:18px;bottom:18px;z-index:16;width:56px;height:56px;border-radius:999px;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px -8px rgba(37,211,102,.7);transition:transform .2s}
.wa-float:hover{transform:scale(1.07)}.wa-float svg{width:30px;height:30px;fill:#fff}
body.has-buybar .wa-float{bottom:86px}@media(min-width:900px){body.has-buybar .wa-float{bottom:18px}}
.toast{position:fixed;left:50%;bottom:24px;z-index:50;transform:translate(-50%,140%);background:var(--ink);color:#fff;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;transition:transform .35s ease;box-shadow:0 12px 30px -10px rgba(0,0,0,.4)}
.toast.show{transform:translate(-50%,0)}

/* aparecer ao rolar */
.reveal{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
`
