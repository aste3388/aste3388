/* ==========================================================================
   유한회사 아성투에버 — 공식 웹사이트 스크립트
   ========================================================================== */
(function () {
  "use strict";

  var d = document;

  /* ---------------------------------------------------------------
     1. Header scroll state
     --------------------------------------------------------------- */
  var header = d.getElementById("header");
  var lastY = window.pageYOffset;

  function onScrollHeader() {
    var y = window.pageYOffset;
    if (y > 10) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
    lastY = y;
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------------------------------------------------------------
     2. Mobile menu
     --------------------------------------------------------------- */
  var hamburger = d.getElementById("hamburger");
  var mobileMenu = d.getElementById("mobileMenu");
  var menuClose = d.getElementById("menuClose");

  function openMenu() {
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    d.body.style.overflow = "hidden";
    menuClose.focus();
  }
  function closeMenu() {
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    d.body.style.overflow = "";
  }
  if (hamburger) hamburger.addEventListener("click", openMenu);
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  if (mobileMenu) {
    mobileMenu.querySelectorAll("a[href^='#']").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    mobileMenu.querySelector(".js-open-contact").addEventListener("click", function () {
      closeMenu();
    });
  }

  /* ---------------------------------------------------------------
     3. Business division tabs
     --------------------------------------------------------------- */
  var tabList = d.querySelector(".divs__tabs");
  var tabs = Array.prototype.slice.call(d.querySelectorAll(".divs__tab"));
  var panels = Array.prototype.slice.call(d.querySelectorAll(".divs__panel"));

  /* 오른쪽 끝까지 스크롤되면 페이드 마스크를 제거한다 */
  function syncTabFade() {
    if (!tabList) return;
    tabList.classList.toggle(
      "at-end",
      tabList.scrollLeft + tabList.clientWidth >= tabList.scrollWidth - 4
    );
  }
  if (tabList) {
    tabList.addEventListener("scroll", syncTabFade, { passive: true });
    window.addEventListener("resize", syncTabFade);
    syncTabFade();
  }

  function activateTab(index, focus) {
    tabs.forEach(function (tab, i) {
      var selected = i === index;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(function (panel, i) {
      var selected = i === index;
      if (selected) {
        panel.removeAttribute("hidden");
        panel.classList.add("is-active");
      } else {
        panel.setAttribute("hidden", "");
        panel.classList.remove("is-active");
      }
    });
    if (focus) tabs[index].focus();
    /* keep the active tab visible in the horizontal mobile strip */
    if (tabList && tabList.scrollWidth > tabList.clientWidth) {
      var tab = tabs[index];
      var target = tab.offsetLeft - (tabList.clientWidth - tab.offsetWidth) / 2;
      tabList.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
      window.setTimeout(syncTabFade, 420);
    }
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activateTab(i); });
    tab.addEventListener("keydown", function (e) {
      var key = e.key;
      var next = null;
      if (key === "ArrowDown" || key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (key === "ArrowUp" || key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (key === "Home") next = 0;
      else if (key === "End") next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        activateTab(next, true);
      }
    });
  });

  /* ---------------------------------------------------------------
     4. Active navigation link
     --------------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(d.querySelectorAll(".nav__link"));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      var el = id && id.length > 1 ? d.querySelector(id) : null;
      return el ? { link: link, el: el } : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (l) { l.classList.remove("is-active"); });
          var match = sections.filter(function (s) { return s.el === entry.target; })[0];
          if (match) match.link.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { navObserver.observe(s.el); });
  }

  /* ---------------------------------------------------------------
     5. Reveal on scroll
     --------------------------------------------------------------- */
  var reveals = Array.prototype.slice.call(d.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && reveals.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 70 + "ms";
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------------------------------------------------------
     6. Contact modal
     --------------------------------------------------------------- */
  var modal = d.getElementById("contactModal");
  var modalDialog = modal.querySelector(".modal__dialog");
  var modalClose = d.getElementById("modalClose");
  var form = d.getElementById("inquiryForm");
  var formError = d.getElementById("formError");
  var resultPanel = d.getElementById("resultPanel");
  var resultText = d.getElementById("resultText");
  var smsLink = d.getElementById("smsLink");
  var copyBtn = d.getElementById("copyBtn");
  var backBtn = d.getElementById("backBtn");
  var TEL = "01028292837";
  var lastFocused = null;

  function openModal() {
    lastFocused = d.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    d.body.style.overflow = "hidden";
    var first = form.querySelector("input");
    window.setTimeout(function () {
      if (first) first.focus();
    }, 60);
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    d.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  Array.prototype.forEach.call(d.querySelectorAll(".js-open-contact"), function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  });
  modalClose.addEventListener("click", closeModal);
  Array.prototype.forEach.call(d.querySelectorAll("[data-close-modal]"), function (el) {
    el.addEventListener("click", closeModal);
  });
  d.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (modal.classList.contains("is-open")) closeModal();
      if (mobileMenu.classList.contains("is-open")) closeMenu();
    }
  });

  /* keep focus inside the dialog while it is open */
  modal.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusables = modalDialog.querySelectorAll(
      "a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    var list = Array.prototype.filter.call(focusables, function (el) {
      return el.offsetParent !== null;
    });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && d.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && d.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------------------------------------------------------------
     7. Inquiry form
     --------------------------------------------------------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function buildMessage(data) {
    var now = new Date();
    var stamp =
      now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
      " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    var lines = [
      "[아성투에버 상담 문의]",
      "",
      "· 회사/브랜드 : " + (data.company || "-"),
      "· 담당자 : " + data.name,
      "· 연락처 : " + data.phone,
      "· 관심 사업부 : " + data.division,
      "· 문의 내용 : " + (data.message || "-"),
      "",
      "(" + stamp + " 작성)"
    ];
    return lines.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      company: form.company.value.trim(),
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      division: form.division.value,
      message: form.message.value.trim()
    };
    if (!data.name || !data.phone) {
      formError.hidden = false;
      (!data.name ? form.name : form.phone).focus();
      return;
    }
    formError.hidden = true;
    var text = buildMessage(data);
    resultText.textContent = text;
    smsLink.setAttribute("href", "sms:" + TEL + "?body=" + encodeURIComponent(text));
    form.hidden = true;
    resultPanel.hidden = false;
    resultPanel.querySelector(".btn--primary").focus();
  });

  copyBtn.addEventListener("click", function () {
    var text = resultText.textContent;
    function done(ok) {
      copyBtn.textContent = ok ? "복사되었습니다" : "복사 실패 — 길게 눌러 복사해 주세요";
      window.setTimeout(function () { copyBtn.textContent = "내용 복사"; }, 2200);
    }
    function legacyCopy(attempt) {
      var ta = d.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      d.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = d.execCommand("copy"); } catch (err) { ok = false; }
      d.body.removeChild(ta);
      done(ok && attempt);
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { legacyCopy(true); }
      );
    } else {
      legacyCopy(true);
    }
  });

  backBtn.addEventListener("click", function () {
    resultPanel.hidden = true;
    form.hidden = false;
    form.querySelector("input").focus();
  });

  /* ---------------------------------------------------------------
     8. Smooth anchor offset for the sticky header
     --------------------------------------------------------------- */
  d.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (a.classList.contains("js-open-contact")) return;
      var href = a.getAttribute("href");
      if (!href || href === "#") return;
      var target = d.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var offset = header.offsetHeight + 8;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  });
})();
