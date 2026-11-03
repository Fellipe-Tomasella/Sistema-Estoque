// Estilo do site público (sem framework: a página chega pronta do servidor e abre rápido no celular).
export const SITE_CSS = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f1b24;background:#fbf9fa}
a{color:inherit}img{display:block;max-width:100%}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
.preview{background:#fef3c7;color:#78350f;text-align:center;font-size:14px;padding:8px 16px}
.top{position:sticky;top:0;z-index:5;background:rgba(251,249,250,.92);backdrop-filter:blur(8px);border-bottom:1px solid #eee6ea}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;height:60px}
.brand{font:600 22px/1 ui-serif,Georgia,serif;text-decoration:none;letter-spacing:.01em}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;
  background:var(--accent);color:#fff;font-weight:600;text-decoration:none;border:0;cursor:pointer;font-size:15px}
.btn:hover{filter:brightness(.95)}
.btn-ghost{background:transparent;color:var(--accent);border:1px solid var(--accent);min-height:38px;padding:6px 14px}
.hero{text-align:center;padding:40px 0 24px}
.hero h1{font:600 clamp(30px,6vw,48px)/1.1 ui-serif,Georgia,serif;margin:0 0 8px}
.hero p{margin:0 auto;max-width:560px;color:#6b6070}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 24px}
.chips a,.chips button{padding:8px 14px;border-radius:999px;border:1px solid #e3d9df;background:#fff;text-decoration:none;font-size:14px;cursor:pointer;color:inherit}
.chips .on{background:var(--accent);border-color:var(--accent);color:#fff}
.chips button:disabled{opacity:.45;text-decoration:line-through;cursor:not-allowed}
.grid{list-style:none;padding:0;margin:0 0 48px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}
@media(min-width:720px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 20px}}
@media(min-width:1000px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.card a{text-decoration:none;display:block}
.ph{position:relative;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:#f1eaee;display:flex;align-items:center;justify-content:center}
.ph img{width:100%;height:100%;object-fit:cover}
.ph span{font:600 48px ui-serif,Georgia,serif;color:#cdbfc7}
.card:hover img{transform:scale(1.03)}.ph img{transition:transform .3s}
.sold .ph img{opacity:.55}
.tag{position:absolute;left:8px;top:8px;background:#fff;border-radius:999px;padding:2px 10px;font:600 12px/1.6 system-ui;font-style:normal}
.name{margin:10px 0 2px;font-size:15px}
.price{margin:0;font-weight:600}
.price.big{font-size:24px;margin:4px 0 16px}
.empty{text-align:center;color:#6b6070;padding:48px 0}
.about{max-width:680px;margin:0 auto 48px;text-align:center;color:#4a4150}
.about h2{font:600 26px ui-serif,Georgia,serif}
.crumbs{font-size:14px;color:#6b6070;padding:16px 0}.crumbs a{text-decoration:none}
.product{display:grid;gap:24px;margin-bottom:48px}
@media(min-width:860px){.product{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:48px}}
.gallery .main{aspect-ratio:4/5}
.thumbs{display:flex;gap:8px;margin-top:10px;overflow-x:auto}
.thumbs button{flex:0 0 64px;height:80px;padding:0;border:2px solid transparent;border-radius:10px;overflow:hidden;background:#f1eaee;cursor:pointer}
.thumbs button.on{border-color:var(--accent)}.thumbs img{width:100%;height:100%;object-fit:cover}
.info h1{font:600 clamp(26px,4vw,36px)/1.15 ui-serif,Georgia,serif;margin:0}
.label{margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b6070}
.opts .chips{justify-content:flex-start;margin-bottom:16px}
.warn{color:#9f1239;font-weight:600}
.desc{color:#4a4150;margin-top:24px;border-top:1px solid #eee6ea;padding-top:8px}
.foot{border-top:1px solid #eee6ea;padding:24px 0 40px;color:#6b6070;font-size:14px}
.foot p{margin:4px 0;display:flex;flex-wrap:wrap;gap:16px}.brand-small{font:600 18px ui-serif,Georgia,serif;color:#1f1b24}
.bag{position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;color:inherit}
.bag svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}
.bag span{position:absolute;top:4px;right:2px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--accent);color:#fff;font:600 11px/18px system-ui;text-align:center}
.wa-float{position:fixed;right:16px;bottom:16px;z-index:10;width:52px;height:52px;border-radius:999px;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.wa-float svg{width:28px;height:28px;fill:#fff}
.btn.wide{width:100%;margin-top:8px}.btn:disabled{opacity:.55;cursor:not-allowed;filter:none}
.ok{color:#047857;font-size:14px}.muted{color:#6b6070;font-size:14px;margin:0}
.hero.small{padding:24px 0 8px}
.cart{display:grid;gap:32px;margin-bottom:64px}@media(min-width:860px){.cart{grid-template-columns:minmax(0,1fr) 380px}}
.bag-list{list-style:none;margin:0;padding:0}
.bag-line{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:12px;padding:12px 0;border-bottom:1px solid #eee6ea;align-items:start}
.ph.small{aspect-ratio:4/5;border-radius:10px}
.bag-info .name{font-weight:600;text-decoration:none}
.qty{display:flex;align-items:center;gap:8px;margin-top:6px}
.qty button{width:32px;height:32px;border-radius:8px;border:1px solid #e3d9df;background:#fff;cursor:pointer;font-size:16px}
.qty .link{width:auto;border:0;background:none;color:#9f1239;font-size:13px;text-decoration:underline}
.bag-total{display:flex;justify-content:space-between;font-size:18px;margin-top:12px}
.checkout,.done{background:#fff;border:1px solid #eee6ea;border-radius:16px;padding:20px;align-self:start}
.checkout h2,.done h2{font:600 22px ui-serif,Georgia,serif;margin:0 0 4px}
.checkout label{display:block;font-size:14px;font-weight:600;margin-top:12px}
.checkout input:not([type=checkbox]),.checkout textarea{display:block;width:100%;margin-top:4px;padding:10px 12px;border:1px solid #e3d9df;border-radius:10px;font:inherit;font-weight:400}
.checkout .check{display:flex;gap:8px;align-items:flex-start;font-weight:400}.checkout .check input{margin-top:3px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.text-left{text-align:left}.text-left h1{font:600 30px ui-serif,Georgia,serif}
.was{color:#9b8f97;font-weight:400;margin-right:4px}
.notice{background:#fdf2f8;border-radius:10px;padding:10px 12px;font-size:14px;color:#4a4150;margin:12px 0 0}
`
