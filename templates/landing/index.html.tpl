<!doctype html>
<html lang="{{lang}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{brandName}} — {{tagline}}</title>
<meta name="description" content="{{metaDescription}}">
<meta property="og:title" content="{{brandName}}">
<meta property="og:description" content="{{metaDescription}}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.ico">
<style>
  :root{
    --primary:{{primaryColor}};
    --secondary:{{secondaryColor}};
    --ink:#12141a;
    --muted:#5b6472;
    --line:#e6e9ef;
    --bg:#ffffff;
    --radius:14px;
    --wrap:1120px;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg)}
  img{max-width:100%;display:block}
  a{color:inherit}
  .wrap{max-width:var(--wrap);margin:0 auto;padding:0 20px}
  header{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);z-index:10}
  .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0}
  .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1.05rem}
  .brand img{height:32px;width:auto}
  .nav-links{display:flex;gap:22px;font-size:.95rem;color:var(--muted)}
  .nav-links a{text-decoration:none}
  .nav-links a:hover{color:var(--ink)}
  @media(max-width:720px){.nav-links{display:none}}

  .hero{padding:72px 0 56px;background:linear-gradient(180deg,rgba(0,0,0,.02),transparent)}
  .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
  @media(max-width:900px){.hero-grid{grid-template-columns:1fr;gap:32px}.hero{padding:44px 0 32px}}
  .eyebrow{display:inline-block;font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:var(--primary);margin-bottom:14px}
  h1{font-size:clamp(1.9rem,4.2vw,3rem);line-height:1.12;margin:0 0 16px;letter-spacing:-.02em}
  .lead{font-size:1.12rem;color:var(--muted);margin:0 0 26px}
  .cta-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
  .btn{display:inline-block;border:0;border-radius:var(--radius);padding:14px 24px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;transition:transform .12s ease,opacity .12s ease}
  .btn:active{transform:translateY(1px)}
  .btn-primary{background:var(--primary);color:#fff}
  .btn-primary:hover{opacity:.92}
  .btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
  .hero-media{border-radius:calc(var(--radius) + 6px);overflow:hidden;border:1px solid var(--line);background:#f7f8fa}
  .hero-media img{width:100%;height:100%;object-fit:cover;aspect-ratio:4/3}

  .usp{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:44px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  @media(max-width:800px){.usp{grid-template-columns:1fr}}
  .usp div strong{display:block;margin-bottom:4px}
  .usp div span{color:var(--muted);font-size:.95rem}

  section.block{padding:64px 0}
  h2{font-size:clamp(1.4rem,2.6vw,2rem);margin:0 0 10px;letter-spacing:-.01em}
  .section-sub{color:var(--muted);margin:0 0 34px;max-width:56ch}

  .products{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}
  .card{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;background:#fff}
  .card img{aspect-ratio:1/1;object-fit:cover;width:100%}
  .card-body{padding:18px;display:flex;flex-direction:column;gap:8px;flex:1}
  .card h3{margin:0;font-size:1.05rem}
  .card p{margin:0;color:var(--muted);font-size:.94rem}
  .price{margin-top:auto;display:flex;align-items:baseline;gap:10px;padding-top:12px}
  .price .now{font-size:1.25rem;font-weight:700}
  .price .was{color:var(--muted);text-decoration:line-through;font-size:.95rem}
  .card .btn{margin-top:12px;text-align:center}
  .badge{display:inline-block;background:var(--secondary);color:#fff;font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em}

  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;counter-reset:s}
  @media(max-width:800px){.steps{grid-template-columns:1fr}}
  .step{border-left:3px solid var(--primary);padding-left:16px}
  .step h4{margin:0 0 6px;font-size:1rem}
  .step p{margin:0;color:var(--muted);font-size:.94rem}

  details{border:1px solid var(--line);border-radius:var(--radius);padding:14px 18px;margin-bottom:10px}
  details summary{cursor:pointer;font-weight:600}
  details p{color:var(--muted);margin:10px 0 0}

  footer{border-top:1px solid var(--line);padding:40px 0;color:var(--muted);font-size:.9rem}
  .foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:26px}
  @media(max-width:800px){.foot-grid{grid-template-columns:1fr}}
  footer h5{margin:0 0 10px;color:var(--ink);font-size:.95rem}
  footer ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
  footer a{text-decoration:none}
  footer a:hover{color:var(--ink)}
  .legal{margin-top:28px;padding-top:18px;border-top:1px solid var(--line);font-size:.84rem}

  #buy-status{display:none;margin-top:14px;padding:12px 16px;border-radius:var(--radius);font-size:.94rem}
  #buy-status.ok{display:block;background:#e8f6ee;color:#14663c}
  #buy-status.err{display:block;background:#fdecea;color:#8a1c14}
</style>
</head>
<body>

<header>
  <div class="wrap nav">
    <div class="brand">
      {{logoImg}}
      <span>{{brandName}}</span>
    </div>
    <nav class="nav-links">
      <a href="#products">{{navProducts}}</a>
      <a href="#how">{{navHow}}</a>
      <a href="#faq">{{navFaq}}</a>
      <a href="#contact">{{navContact}}</a>
    </nav>
  </div>
</header>

<main>

<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <span class="eyebrow">{{eyebrow}}</span>
      <h1>{{headline}}</h1>
      <p class="lead">{{subheadline}}</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#products">{{ctaPrimary}}</a>
        <a class="btn btn-ghost" href="#how">{{ctaSecondary}}</a>
      </div>
      <div id="buy-status" role="status" aria-live="polite"></div>
    </div>
    <div class="hero-media">{{heroImg}}</div>
  </div>
</section>

<div class="wrap">
  <div class="usp">
    {{uspItems}}
  </div>
</div>

<section class="block" id="products">
  <div class="wrap">
    <h2>{{productsTitle}}</h2>
    <p class="section-sub">{{productsSub}}</p>
    <div class="products">
      {{productCards}}
    </div>
  </div>
</section>

<section class="block" id="how" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <h2>{{howTitle}}</h2>
    <p class="section-sub">{{howSub}}</p>
    <div class="steps">
      <div class="step"><h4>{{howStep1Title}}</h4><p>{{howStep1Text}}</p></div>
      <div class="step"><h4>{{howStep2Title}}</h4><p>{{howStep2Text}}</p></div>
      <div class="step"><h4>{{howStep3Title}}</h4><p>{{howStep3Text}}</p></div>
    </div>
  </div>
</section>

<section class="block" id="faq" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <h2>{{faqTitle}}</h2>
    <p class="section-sub">{{faqSub}}</p>
    {{faqItems}}
  </div>
</section>

</main>

<footer id="contact">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h5>{{brandName}}</h5>
        <p style="margin:0 0 8px">{{legalName}}</p>
        <p style="margin:0 0 8px">{{addressBlock}}</p>
        <p style="margin:0">EIK: {{eik}}<br>VAT: {{vatId}}</p>
      </div>
      <div>
        <h5>{{navContact}}</h5>
        <ul>
          <li><a href="mailto:{{email}}">{{email}}</a></li>
          <li><a href="tel:{{phoneRaw}}">{{phone}}</a></li>
        </ul>
      </div>
      <div>
        <h5>{{legalTitle}}</h5>
        <ul>
          <li><a href="/pages/obshti-usloviya">{{lTerms}}</a></li>
          <li><a href="/pages/poveritelnost">{{lPrivacy}}</a></li>
          <li><a href="/pages/pravo-na-otkaz">{{lWithdrawal}}</a></li>
          <li><a href="/pages/dostavka-i-plashtane">{{lShipping}}</a></li>
        </ul>
      </div>
    </div>
    <div class="legal">
      &copy; <span id="yr"></span> {{legalName}}. {{legalRights}}
    </div>
  </div>
</footer>

<script>
(function () {
  'use strict';
  document.getElementById('yr').textContent = new Date().getFullYear();

  var status = document.getElementById('buy-status');

  function show(msg, isError) {
    status.textContent = msg;
    status.className = isError ? 'err' : 'ok';
    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  document.querySelectorAll('[data-buy]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var slug = btn.getAttribute('data-buy');
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = '{{buyLoading}}';

      fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.url) { window.location.href = data.url; return; }
          show((data && data.message) || '{{buyError}}', true);
        })
        .catch(function () { show('{{buyError}}', true); })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  });
})();
</script>

</body>
</html>
