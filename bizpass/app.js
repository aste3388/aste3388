/* ==========================================================================
   아성 AI 비즈패스 (BizPass) — 진단·매칭·서류·접수 지원 스크립트
   - 모든 계산은 브라우저에서만 수행합니다(서버 전송 없음).
   ========================================================================== */
(function () {
  "use strict";

  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  var TODAY = new Date();
  var THIS_YEAR = TODAY.getFullYear();

  /* ---------------------------------------------------------------
     라벨 사전
     --------------------------------------------------------------- */
  var INDUSTRY = {
    food: "외식·음식점", retail: "도·소매", manufacture: "제조·가공",
    service: "서비스", fishery: "수산·농림", construction: "건설·부동산", etc: "기타"
  };
  var BIZAGE = {
    pre: "예비창업", lt1: "1년 미만", "1to3": "1~3년", "3to7": "3~7년", over7: "7년 이상"
  };
  var REGION = { metro: "수도권", city: "광역시", province: "도 지역", jeju: "제주" };
  var SALES = {
    "0.5": "5천만 원 미만", "1": "5천만~1억 원", "3": "1억~3억 원",
    "10": "3억~10억 원", "30": "10억~30억 원", "99": "30억 원 이상"
  };
  var WORKERS = { "0": "1인 사업장", "1": "1~4명", "5": "5~9명", "10": "10~49명", "50": "50명 이상" };
  var BIZTYPE = { sole: "개인사업자", corp: "법인사업자", prep: "예비창업" };

  /* ---------------------------------------------------------------
     2026 지원사업 데이터 (15종)
     cond 값이 없으면 해당 조건은 심사하지 않습니다(전 업종·전 지역 공통).
     --------------------------------------------------------------- */
  var PROGRAMS = [
    {
      id: "youth-startup", cat: "policy", catLabel: "정책자금", focus: "youth",
      title: "청년전용 창업자금", agency: "소상공인시장진흥공단(소진공)",
      limit: "최대 1억 원", limitNote: "융자(운전·시설)",
      rate: "정책자금 기준금리(변동) · 2년 거치 5년 분할",
      target: "만 39세 이하 예비창업자 또는 업력 3년 미만 소상공인",
      cond: { ageMax: 39, bizAge: ["pre", "lt1", "1to3"] },
      docs: ["사업계획서(자금 용도·상환 계획)", "창업교육 이수증(해당 시)", "가족관계증명서(청년 연령 확인, 해당 시)"],
      caveat: "연령·업력 요건과 한도는 연도별 공고에 따라 달라집니다."
    },
    {
      id: "growth-fund", cat: "policy", catLabel: "정책자금", focus: "general",
      title: "성장촉진자금", agency: "소상공인시장진흥공단(소진공)",
      limit: "최대 1억 원", limitNote: "융자",
      rate: "정책자금 기준금리(변동) · 2년 거치 5년 분할",
      target: "성장 가능성이 있는 소상공인 (업력 1년 이상)",
      cond: { bizAge: ["1to3", "3to7", "over7"] },
      docs: ["사업계획서(성장 전략·자금 사용 계획)", "최근 3개년 재무제표(법인)", "매출 증빙 자료"],
      caveat: "성장성·상환능력 심사가 함께 진행됩니다."
    },
    {
      id: "stable-fund", cat: "policy", catLabel: "정책자금", focus: "general",
      title: "일반경영안정자금", agency: "소상공인시장진흥공단(소진공)",
      limit: "최대 7천만 원", limitNote: "융자",
      rate: "정책자금 기준금리(변동) · 1년 거치 4년 분할",
      target: "매출 감소·경영 애로를 겪는 소상공인",
      cond: { bizAge: ["lt1", "1to3", "3to7", "over7"] },
      docs: ["자금 사용 계획서", "최근 1년 매출 증빙", "매출 감소 확인 자료(해당 시)"],
      caveat: "사업자등록 후 일정 기간이 지나야 신청할 수 있습니다."
    },
    {
      id: "local-guarantee", cat: "guarantee", catLabel: "특례보증", focus: "general",
      title: "지역신용보증재단 특례보증", agency: "지역신용보증재단(경기·인천 등)",
      limit: "최대 1억 원", limitNote: "보증서 발급(재단별 상이)",
      rate: "보증료 연 0.5~1.0% · 은행 대출금리 별도",
      target: "담보력이 부족한 지역 소상공인",
      cond: { salesMax: 30, workersMax: 50 },
      docs: ["보증신청서", "사업장 임대차계약서 사본", "소득금액증명(대표자)", "신용조회 동의서"],
      caveat: "지역·업종별 보증 한도와 보증료율이 다르며, 신용 심사가 필요합니다."
    },
    {
      id: "women-fund", cat: "guarantee", catLabel: "특례보증", focus: "women",
      title: "여성기업 특례보증·우대자금", agency: "신용보증기금·지역신보·소진공",
      limit: "최대 1억 원", limitNote: "보증·융자 연계",
      rate: "보증료·금리 우대 적용(기관별 상이)",
      target: "여성이 대표이거나 여성 지분 50% 이상인 기업",
      cond: { gender: "female" },
      docs: ["여성기업확인서 또는 대표자 여성 확인 서류", "보증신청서", "사업장 임대차계약서 사본"],
      caveat: "여성기업확인서 발급이 선행되면 심사가 수월합니다."
    },
    {
      id: "women-cert", cat: "support", catLabel: "지원사업", focus: "women",
      title: "여성기업확인서 발급·공공구매 우대", agency: "중소벤처기업부·여성기업종합지원센터",
      limit: "공공기관 우선구매·가점", limitNote: "인증·판로 우대",
      rate: "확인 수수료 없음",
      target: "여성 대표 개인사업자 또는 여성 지분 50% 이상 법인",
      cond: { gender: "female" },
      docs: ["여성기업확인 신청서", "법인등기부등본(법인)", "주주명부(법인)", "사업자등록증 사본"],
      caveat: "확인서 유효기간(3년)이 있어 갱신이 필요합니다."
    },
    {
      id: "smart-store", cat: "support", catLabel: "지원사업", focus: "general",
      title: "스마트상점 기술보급사업", agency: "중소벤처기업부·소상공인시장진흥공단",
      limit: "최대 3,000만 원 규모", limitNote: "지원 50~70% · 자부담 있음",
      rate: "키오스크·POS·서빙로봇 등 기술 도입",
      target: "외식·도소매·서비스 업종의 매장 운영 소상공인",
      cond: { industry: ["food", "retail", "service"] },
      docs: ["스마트기기 도입 견적서", "매장 사진", "사업계획서(기술 도입 효과)"],
      caveat: "연도별 예산·품목에 따라 지원 규모가 달라집니다."
    },
    {
      id: "online-sales", cat: "support", catLabel: "지원사업", focus: "general",
      title: "소상공인 온라인판로(O2O·라이브커머스)", agency: "소상공인시장진흥공단",
      limit: "최대 500만 원 상당", limitNote: "입점·콘텐츠 제작 지원",
      rate: "자부담 10~30%(사업별)",
      target: "온라인 판매 채널을 새로 열려는 소상공인",
      cond: { industry: ["food", "retail", "manufacture", "service", "fishery"] },
      docs: ["온라인 판매 채널 현황", "상품 소개서·이미지", "사업자 통장 사본"],
      caveat: "플랫폼 입점 심사는 별도로 진행됩니다."
    },
    {
      id: "hope-return", cat: "support", catLabel: "지원사업", focus: "general",
      title: "희망리턴패키지(폐업·재창업)", agency: "중소벤처기업부·소상공인시장진흥공단",
      limit: "점포철거비 최대 250만 원", limitNote: "재창업 교육·컨설팅 병행",
      rate: "비용 보조 + 무료 교육",
      target: "폐업(예정) 소상공인·재창업 희망자",
      cond: { bizAge: ["1to3", "3to7", "over7"], industry: ["food", "retail", "service", "manufacture", "etc", "fishery", "construction"] },
      docs: ["폐업(예정) 확인 서류", "점포 임대차계약서·철거 견적서", "재창업 교육 이수 신청서"],
      caveat: "폐업 예정이거나 이미 폐업한 사업자만 신청할 수 있습니다."
    },
    {
      id: "export-voucher", cat: "support", catLabel: "지원사업", focus: "general",
      title: "수출바우처", agency: "중소벤처기업부·KOTRA",
      limit: "최대 1억 원", limitNote: "자부담 10~30%",
      rate: "홍보·인증·물류·바이어 매칭 서비스 이용권",
      target: "수출을 준비하거나 확대하려는 중소기업·소상공인",
      cond: { industry: ["manufacture", "retail", "food", "service", "fishery", "etc"], salesMax: 99 },
      docs: ["수출 역량 자체 진단서", "수출 계획서", "최근 매출·수출 실적 증빙", "중소기업 확인서"],
      caveat: "수출 실적·역량 평가로 선정되며, 수행기관 계약이 필요합니다."
    },
    {
      id: "youth-job", cat: "hire", catLabel: "고용·세제", focus: "youth",
      title: "청년일자리도약장려금", agency: "고용노동부·고용센터",
      limit: "1인당 최대 1,080만 원", limitNote: "2년 분할 지급",
      rate: "청년 1명 채용 시 월 단위 지원",
      target: "취업애로청년(만 15~34세)을 정규직으로 채용한 사업장",
      cond: {},
      docs: ["청년 근로자 근로계약서", "4대보험 가입 확인서", "임금대장", "취업애로청년 확인 서류"],
      caveat: "채용 시점·청년 요건(고졸·장기실업 등) 확인이 필요합니다."
    },
    {
      id: "senior-hire", cat: "hire", catLabel: "고용·세제", focus: "senior",
      title: "고령자 계속고용장려금", agency: "고용노동부·고용센터",
      limit: "1인당 월 최대 30만 원", limitNote: "지원 기간 사업장 규모별 상이",
      rate: "60세 이상 근로자 계속 고용 시",
      target: "정년 이후 근로자를 계속 고용하는 사업장",
      cond: { workersMax: 300 },
      docs: ["고령자 근로계약서·계속고용 확인서", "임금대장", "4대보험 가입 확인서"],
      caveat: "계속고용 제도(정년연장·재고용) 운영 요건을 충족해야 합니다."
    },
    {
      id: "social-insurance", cat: "hire", catLabel: "고용·세제", focus: "general",
      title: "두루누리 사회보험료 지원", agency: "근로복지공단·국민연금공단",
      limit: "보험료의 최대 80%", limitNote: "신규 가입 근로자 기준",
      rate: "월 보수 270만 원 미만 근로자",
      target: "10명 미만 사업장의 저소득 근로자",
      cond: { workersMax: 9 },
      docs: ["4대보험 가입 신청서", "근로계약서", "사업자등록증 사본"],
      caveat: "지원 인원·기간은 연도별 기준에 따라 달라집니다."
    },
    {
      id: "gyeonggi-fund", cat: "policy", catLabel: "정책자금", focus: "general",
      title: "경기도 중소기업육성자금 이차보전", agency: "경기도·경기신용보증재단",
      limit: "시설 최대 10억·운전 최대 3억", limitNote: "대출 이자 일부 보전",
      rate: "이차보전 최대 연 3%",
      target: "경기도에 사업장을 둔 중소기업·소기업",
      cond: { region: ["metro"] },
      docs: ["경기도 중소기업육성자금 신청서", "사업계획서", "재무제표·매출 증빙", "지방세 납세증명서"],
      caveat: "경기도 소재 사업장만 신청할 수 있으며, 타 지역은 해당 지자체 자금으로 안내합니다."
    },
    {
      id: "local-fund", cat: "policy", catLabel: "정책자금", focus: "general",
      title: "광역시·도 중소기업육성자금 이차보전", agency: "광역시·도 / 지역 신용보증재단",
      limit: "시설 최대 10억·운전 최대 5억", limitNote: "대출 이자 일부 보전",
      rate: "이차보전 최대 연 3%(지자체별 상이)",
      target: "수도권 외 광역시·도에 사업장을 둔 중소기업·소상공인",
      cond: { region: ["city", "province", "jeju"] },
      docs: ["지자체 융자 신청서", "사업계획서", "재무제표·매출 증빙", "지방세 납세증명서"],
      caveat: "관할 지자체의 연간 자금 공고와 접수 기간을 확인해야 합니다."
    }
  ];

  /* ---------------------------------------------------------------
     공통 서류
     --------------------------------------------------------------- */
  var COMMON_DOCS = [
    { name: "사업자등록증명", issuer: "국세청 홈택스", note: "발급 즉시" },
    { name: "부가가치세 과세표준증명", issuer: "국세청 홈택스", note: "최근 확정 신고분" },
    { name: "국세 납세증명서(완납)", issuer: "국세청 홈택스", note: "유효기간 확인" },
    { name: "지방세 납세증명서", issuer: "정부24·위택스", note: "유효기간 확인" },
    { name: "대표자 신분증 사본", issuer: "본인 준비", note: "주민등록증·운전면허증" },
    { name: "사업장 임대차계약서 사본", issuer: "본인 준비", note: "소유는 등기사항증명서" },
    { name: "최근 매출 증빙", issuer: "홈택스·카드사", note: "세금계산서 합계표 등" },
    { name: "4대보험 가입자 명부", issuer: "4대보험 포털", note: "근로자 있는 경우" }
  ];

  /* ---------------------------------------------------------------
     상태
     --------------------------------------------------------------- */
  var state = {
    input: null,
    matches: [],
    excluded: [],
    selected: {},       // id -> true
    checked: {}         // docKey -> true
  };

  /* ---------------------------------------------------------------
     1. 헤더 · 모바일 메뉴
     --------------------------------------------------------------- */
  var header = $("#header");
  function onScroll() {
    if (window.pageYOffset > 12) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var hamburger = $("#hamburger"), mobileMenu = $("#mobileMenu"), menuClose = $("#menuClose");
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
  hamburger.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);
  $$("#mobileMenu a").forEach(function (a) {
    a.addEventListener("click", function () {
      closeMenu();
      var target = a.getAttribute("href");
      if (target && target.charAt(0) === "#") {
        var el = d.querySelector(target);
        if (el && el.hidden) {
          d.querySelector("#diagnose").scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  /* ---------------------------------------------------------------
     2. 사업자등록번호 · 나이 입력
     --------------------------------------------------------------- */
  var bizNo = $("#bizNo"), bizMsg = $("#bizMsg"), bizState = $("#bizState");

  function formatBiz(v) {
    var n = String(v).replace(/\D/g, "").slice(0, 10);
    if (n.length <= 3) return n;
    if (n.length <= 5) return n.slice(0, 3) + "-" + n.slice(3);
    return n.slice(0, 3) + "-" + n.slice(3, 5) + "-" + n.slice(5);
  }
  function isValidBiz(n) {
    var digits = String(n).replace(/\D/g, "");
    if (digits.length !== 10) return false;
    var w = [1, 3, 7, 1, 3, 7, 1, 3, 5], sum = 0;
    for (var i = 0; i < 9; i++) sum += Number(digits[i]) * w[i];
    sum += Math.floor((Number(digits[8]) * 5) / 10);
    return (10 - (sum % 10)) % 10 === Number(digits[9]);
  }

  bizNo.addEventListener("input", function () {
    var pos = bizNo.selectionStart;
    var before = bizNo.value.length;
    bizNo.value = formatBiz(bizNo.value);
    try {
      var delta = bizNo.value.length - before;
      bizNo.setSelectionRange(pos + delta, pos + delta);
    } catch (e) { /* ignore */ }
    checkBiz(true);
  });
  bizNo.addEventListener("blur", function () { checkBiz(true); });

  function checkBiz(show) {
    var digits = bizNo.value.replace(/\D/g, "");
    bizState.className = "biz-input__state";
    bizMsg.className = "field__msg";
    if (!digits.length) {
      bizMsg.textContent = "숫자 10자리를 입력하면 자동으로 형식이 맞춰지고 검증 숫자를 확인합니다.";
      return false;
    }
    if (digits.length < 10) {
      if (show) bizMsg.textContent = digits.length + "/10자리 입력 중입니다.";
      return false;
    }
    if (isValidBiz(digits)) {
      bizState.classList.add("is-ok");
      bizMsg.classList.add("is-ok");
      bizMsg.textContent = "형식·검증번호 확인 완료. 실제 사업자 상태(계속·휴업·폐업)는 국세청 조회로 접수 단계에서 확인합니다.";
      return true;
    }
    bizState.classList.add("is-error");
    bizMsg.classList.add("is-error");
    bizMsg.textContent = "검증번호가 맞지 않습니다. 사업자등록증의 번호를 다시 확인해 주세요.";
    return false;
  }

  var ageValue = $("#ageValue"), ageUnit = $("#ageUnit"), ageMsg = $("#ageMsg");
  var ageMode = "birth";

  function calcAge() {
    var raw = ageValue.value.replace(/\D/g, "");
    if (!raw) return null;
    var n = Number(raw);
    if (ageMode === "birth") {
      if (n < 1900 || n > THIS_YEAR) return null;
      return THIS_YEAR - n;
    }
    if (n < 14 || n > 100) return null;
    return n;
  }

  function updateAgeBand() {
    var age = calcAge();
    var band = age === null ? null : (age <= 39 ? "youth" : (age <= 59 ? "mid" : "senior"));
    $$(".ageband__chip").forEach(function (c) {
      c.classList.toggle("is-on", c.getAttribute("data-band") === band);
    });
    ageMsg.className = "field__msg";
    if (age === null) {
      ageMsg.textContent = ageMode === "birth"
        ? "출생연도를 넣으면 만 나이와 연령 구간을 자동으로 판별합니다."
        : "만 나이를 넣으면 연령 구간을 자동으로 판별합니다.";
      return;
    }
    var bandLabel = band === "youth" ? "청년(만 39세 이하)" : (band === "mid" ? "중장년(40~59세)" : "시니어(60세 이상)");
    ageMsg.classList.add("is-ok");
    ageMsg.textContent = ageMode === "birth"
      ? "만 " + age + "세 · " + bandLabel + " (출생연도 기준, 생일 미반영)"
      : "만 " + age + "세 · " + bandLabel;
  }

  ageValue.addEventListener("input", function () {
    ageValue.value = ageValue.value.replace(/\D/g, "").slice(0, 4);
    updateAgeBand();
  });
  $$("input[name='ageMode']").forEach(function (r) {
    r.addEventListener("change", function () {
      ageMode = r.value;
      ageUnit.textContent = ageMode === "birth" ? "년생" : "세";
      ageValue.setAttribute("maxlength", ageMode === "birth" ? "4" : "3");
      ageValue.value = "";
      ageValue.placeholder = ageMode === "birth" ? "예) 1991" : "예) 35";
      updateAgeBand();
    });
  });

  /* ---------------------------------------------------------------
     3. 예시 채우기
     --------------------------------------------------------------- */
  function fillExample() {
    bizNo.value = "123-45-67891";
    checkBiz(true);
    var female = $("input[name='gender'][value='female']");
    female.checked = true;
    var birth = $("input[name='ageMode'][value='birth']");
    birth.checked = true;
    ageMode = "birth";
    ageUnit.textContent = "년생";
    ageValue.value = "1991";
    ageValue.placeholder = "예) 1991";
    $("#industry").value = "food";
    $("#bizAge").value = "1to3";
    $("#region").value = "metro";
    $("#sales").value = "3";
    $("#workers").value = "1";
    $("#bizType").value = "sole";
    updateAgeBand();
  }
  $("#exampleBtn").addEventListener("click", fillExample);
  $("#exampleBizBtn").addEventListener("click", function () {
    bizNo.value = "123-45-67891";
    checkBiz(true);
    bizNo.focus();
  });

  /* ---------------------------------------------------------------
     4. 매칭 엔진
     --------------------------------------------------------------- */
  function focusMatch(p, input) {
    if (p.focus === "youth") return input.age <= 39;
    if (p.focus === "women") return input.gender === "female";
    if (p.focus === "senior") return input.age >= 60;
    return false;
  }

  function evaluate(p, input) {
    var c = p.cond || {};
    var fails = [];
    var reasons = [];

    if (c.gender && input.gender !== c.gender) {
      fails.push("대표자 성별 조건(여성 대표)에 해당하지 않습니다.");
    }
    if (c.ageMax != null && input.age > c.ageMax) {
      fails.push("대표자 만 " + input.age + "세 — 만 " + c.ageMax + "세 이하 대상입니다.");
    }
    if (c.ageMin != null && input.age < c.ageMin) {
      fails.push("대표자 만 " + input.age + "세 — 만 " + c.ageMin + "세 이상 대상입니다.");
    }
    if (c.bizAge && c.bizAge.indexOf(input.bizAge) === -1) {
      fails.push("업력 " + BIZAGE[input.bizAge] + " — " + c.bizAge.map(function (k) { return BIZAGE[k]; }).join("·") + " 대상입니다.");
    }
    if (c.industry && c.industry.indexOf(input.industry) === -1) {
      fails.push(INDUSTRY[input.industry] + " 업종은 지원 대상 업종이 아닙니다.");
    }
    if (c.region && c.region.indexOf(input.region) === -1) {
      fails.push(REGION[input.region] + " 사업장 — " + c.region.map(function (k) { return REGION[k]; }).join("·") + " 소재 사업장 대상입니다.");
    }
    if (c.workersMax != null && Number(input.workers) > c.workersMax) {
      fails.push("상시근로자 " + WORKERS[input.workers] + " — " + c.workersMax + "명 이하 사업장 대상입니다.");
    }
    if (c.salesMax != null && Number(input.sales) > c.salesMax) {
      fails.push("연매출 " + SALES[input.sales] + " — " + c.salesMax + "억 원 이하 대상입니다.");
    }
    if (fails.length) return { eligible: false, fails: fails, reasons: [], score: 0 };

    /* 적합 사유 */
    if (c.gender) reasons.push("여성 대표 — 여성기업 우대 대상입니다.");
    if (c.ageMax != null) reasons.push("만 " + input.age + "세 · 청년(만 " + c.ageMax + "세 이하) 요건을 충족합니다.");
    if (c.ageMin != null) reasons.push("만 " + input.age + "세 · 연령 요건을 충족합니다.");
    if (c.bizAge) reasons.push("업력 " + BIZAGE[input.bizAge] + " — 지원 업력 구간에 해당합니다.");
    if (c.industry) reasons.push(INDUSTRY[input.industry] + " 업종이 지원 대상에 포함됩니다.");
    if (c.region) reasons.push(REGION[input.region] + " 사업장 — 지역 요건을 충족합니다.");
    if (c.workersMax != null) reasons.push("상시근로자 " + WORKERS[input.workers] + " — " + c.workersMax + "명 이하 요건을 충족합니다.");
    if (c.salesMax != null) reasons.push("연매출 " + SALES[input.sales] + " — " + c.salesMax + "억 원 이하 요건을 충족합니다.");
    if (!reasons.length) reasons.push("업종·업력 제한이 없는 전국 공통 상품입니다.");

    /* 점수 */
    var score = 64;
    if (c.ageMax != null || c.ageMin != null || c.gender) score += 12;
    if (c.bizAge) score += 8;
    if (c.industry) score += 6;
    if (c.region) score += 6;
    if (c.workersMax != null) score += 5;
    if (c.salesMax != null) score += 5;
    if (focusMatch(p, input)) score += 8;
    score = Math.max(55, Math.min(97, score));

    return { eligible: true, fails: [], reasons: reasons, score: score };
  }

  function badgesFor(p, res, input) {
    var out = [];
    var strong = res.score >= 80 && !p.caveatStrong;
    out.push({ cls: strong ? "badge--reco" : "badge--check", text: strong ? "추천" : "검토" });
    if (p.focus === "women" && input.gender === "female") out.push({ cls: "badge--women", text: "여성우대" });
    if (p.focus === "youth" && input.age <= 39) out.push({ cls: "badge--youth", text: "청년우대" });
    if (p.focus === "senior" && input.age >= 60) out.push({ cls: "badge--senior", text: "시니어우대" });
    out.push({ cls: "badge--cat", text: p.catLabel });
    return out;
  }

  function labelFor(id) {
    if (id === "pre") return "예비창업";
    return BIZAGE[id] || id;
  }

  /* ---------------------------------------------------------------
     5. 진단 실행
     --------------------------------------------------------------- */
  var diagnoseForm = $("#diagnoseForm"), formError = $("#formError");

  diagnoseForm.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.hidden = true;

    var digits = bizNo.value.replace(/\D/g, "");
    if (!digits.length) return fail("사업자등록번호를 입력해 주세요.", bizNo);
    if (digits.length !== 10 || !isValidBiz(digits)) {
      return fail("사업자등록번호 10자리를 정확히 입력해 주세요. (검증번호 불일치)", bizNo);
    }
    var age = calcAge();
    if (age === null) return fail("대표자 나이를 확인해 주세요. 출생연도 4자리 또는 만 나이를 입력해 주세요.", ageValue);

    var input = {
      bizNo: formatBiz(digits),
      gender: ($("input[name='gender']:checked") || {}).value || "male",
      age: age,
      industry: $("#industry").value,
      bizAge: $("#bizAge").value,
      region: $("#region").value,
      sales: $("#sales").value,
      workers: $("#workers").value,
      bizType: $("#bizType").value
    };
    state.input = input;

    var matches = [], excluded = [];
    PROGRAMS.forEach(function (p) {
      var res = evaluate(p, input);
      var item = { p: p, res: res };
      if (res.eligible) {
        item.badges = badgesFor(p, res, input);
        item.strong = res.score >= 80 && !p.caveatStrong;
        matches.push(item);
      } else {
        excluded.push(item);
      }
    });

    matches.sort(function (a, b) {
      var ar = (a.badges[0].text === "추천") ? 0 : 1;
      var br = (b.badges[0].text === "추천") ? 0 : 1;
      if (ar !== br) return ar - br;
      return b.res.score - a.res.score;
    });
    excluded.sort(function (a, b) { return a.p.title.localeCompare(b.p.title); });

    state.matches = matches;
    state.excluded = excluded;
    state.selected = {};

    /* 추천 상위 2건 기본 선택 */
    matches.filter(function (m) { return m.badges[0].text === "추천"; })
      .slice(0, 2)
      .forEach(function (m) { state.selected[m.p.id] = true; });

    renderResult();
    $("#result").hidden = false;
    setStep(2);
    setTimeout(function () {
      $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  });

  function fail(msg, field) {
    formError.textContent = msg;
    formError.hidden = false;
    if (field) field.focus();
  }

  function setStep(n) {
    for (var i = 1; i <= 3; i++) {
      var el = $("#stepper" + i);
      if (!el) continue;
      el.classList.toggle("is-active", i === n);
      el.classList.toggle("is-done", i < n);
    }
  }

  /* ---------------------------------------------------------------
     6. 결과 렌더
     --------------------------------------------------------------- */
  function renderResult() {
    var input = state.input;
    var ageBand = input.age <= 39 ? "청년 · 만 39세 이하" : (input.age <= 59 ? "중장년 · 40~59세" : "시니어 · 60세 이상");

    $("#profileBox").innerHTML =
      '<span class="profile__biz">' + input.bizNo + "</span>" +
      '<span class="profile__sep"></span>' +
      '<span class="tag">' + INDUSTRY[input.industry] + "</span>" +
      '<span class="tag">업력 ' + BIZAGE[input.bizAge] + "</span>" +
      '<span class="tag">' + REGION[input.region] + "</span>" +
      '<span class="tag">연매출 ' + SALES[input.sales] + "</span>" +
      '<span class="tag">상시근로자 ' + WORKERS[input.workers] + "</span>" +
      '<span class="tag">' + BIZTYPE[input.bizType] + "</span>" +
      '<span class="tag tag--green">' + (input.gender === "female" ? "여성 대표" : "남성 대표") + " · 만 " + input.age + "세</span>" +
      '<span class="tag tag--gold">' + ageBand + "</span>";

    $("#resultLead").textContent =
      "사업자등록번호 " + input.bizNo + "·대표자 만 " + input.age + "세(" + (input.gender === "female" ? "여성" : "남성") + ") 조건으로 "
      + PROGRAMS.length + "개 상품을 비교했습니다. 추천 순으로 정렬되어 있습니다.";

    var list = $("#resultList");
    list.innerHTML = "";

    state.matches.forEach(function (item, idx) {
      var p = item.p, res = item.res;
      var checked = state.selected[p.id] ? " checked" : "";
      var el = d.createElement("article");
      el.className = "rcard" + (state.selected[p.id] ? " is-selected" : "");
      el.innerHTML =
        '<div class="rcard__top">' +
          '<span class="rcard__rank">' + String(idx + 1).padStart(2, "0") + "</span>" +
          '<div class="rcard__head">' +
            '<div class="rcard__badges">' + item.badges.map(function (b) {
              return '<span class="badge ' + b.cls + '">' + b.text + "</span>";
            }).join("") + "</div>" +
            '<h3 class="rcard__title">' + p.title + "</h3>" +
            '<p class="rcard__agency">' + p.agency + '</p>' +
          "</div>" +
          '<div class="rcard__score"><span>적합도</span><b>' + res.score + '%</b><div class="rcard__scorebar"><span style="width:' + res.score + '%"></span></div></div>' +
        "</div>" +
        '<dl class="rcard__facts">' +
          "<div class=\"fact\"><dt>한도·지원금</dt><dd>" + p.limit + "<small>" + p.limitNote + "</small></dd></div>" +
          "<div class=\"fact\"><dt>금리·조건</dt><dd>" + p.rate + "</dd></div>" +
          "<div class=\"fact\"><dt>지원 대상</dt><dd>" + p.target + "</dd></div>" +
        "</dl>" +
        '<div class="rcard__mid">' +
          '<div class="rcard__block"><h4>매칭 이유</h4><ul class="reasons">' +
            res.reasons.map(function (r) { return "<li>" + r + "</li>"; }).join("") +
            (p.caveat ? '<li class="is-doc">' + p.caveat + "</li>" : "") +
          "</ul></div>" +
          '<div class="rcard__block"><h4>추가 필요 서류 ' + p.docs.length + "종</h4>" +
            '<div class="rcard__docs">' + p.docs.map(function (x) { return '<span class="docchip">' + x + "</span>"; }).join("") + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="rcard__foot">' +
          '<label class="rcard__pick"><input type="checkbox" data-pick="' + p.id + '"' + checked + " /><span>이 사업으로 서류 준비</span></label>" +
          '<p class="rcard__caveat">1차 진단 결과 · 최종 수급 여부는 기관 심사에 따릅니다</p>' +
        "</div>";
      list.appendChild(el);
    });

    $("#matchCount").textContent = state.matches.length;
    $("#excludeCount").textContent = state.excluded.length;
    $("#excludedNum").textContent = state.excluded.length;

    $("#excludedList").innerHTML = state.excluded.map(function (item) {
      return "<li><b>" + item.p.title + "</b><span>" + item.res.fails.join(" ") + "</span></li>";
    }).join("") || "<li><b>제외된 사업이 없습니다.</b><span>입력 조건에 맞는 사업이 모두 매칭되었습니다.</span></li>";
    $("#excludedBox").hidden = state.excluded.length === 0;

    $$("input[data-pick]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-pick");
        if (cb.checked) state.selected[id] = true;
        else delete state.selected[id];
        cb.closest(".rcard").classList.toggle("is-selected", cb.checked);
        syncSelection();
      });
    });

    syncSelection();
  }

  function syncSelection() {
    var n = Object.keys(state.selected).length;
    $("#selectedSum").textContent = n ? n + "개 사업 선택됨" : "선택한 사업 없음";
    $("#toDocsBtn").disabled = n === 0;
    $("#toDocsBtn").textContent = n ? "선택 사업 서류 준비하기 (" + n + ")" : "선택 사업 서류 준비하기";
  }

  $("#reDiagnoseBtn").addEventListener("click", function () {
    $("#diagnose").scrollIntoView({ behavior: "smooth" });
    setTimeout(function () { bizNo.focus(); }, 400);
  });

  $("#selectAllBtn").addEventListener("click", function () {
    var targets = state.matches.filter(function (m) { return m.badges[0].text === "추천"; });
    if (!targets.length) targets = state.matches.slice(0, 3);
    var allOn = targets.every(function (m) { return state.selected[m.p.id]; });
    targets.forEach(function (m) {
      if (allOn) delete state.selected[m.p.id];
      else state.selected[m.p.id] = true;
    });
    renderResult();
  });

  $("#toDocsBtn").addEventListener("click", function () {
    buildDocs();
    $("#applyCard").hidden = false;
    $("#receiptPanel").hidden = true;
    $("#documents").hidden = false;
    setStep(3);
    setTimeout(function () {
      $("#documents").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  });

  /* ---------------------------------------------------------------
     7. 서류 체크리스트
     --------------------------------------------------------------- */
  function selectedPrograms() {
    return state.matches.filter(function (m) { return state.selected[m.p.id]; }).map(function (m) { return m.p; });
  }

  function docKey(scope, name) { return scope + "::" + name; }

  function checkRow(scope, doc) {
    var key = docKey(scope, doc.name);
    var on = state.checked[key] ? " checked" : "";
    return '<li><label class="check"><input type="checkbox" data-doc="' + key + '"' + on + " />" +
      '<span class="check__body"><span class="check__name">' + doc.name + "</span>" +
      '<span class="check__meta"><span class="issuer">' + doc.issuer + "</span>" +
      (doc.note ? "<i>" + doc.note + "</i>" : "") + "</span></span></label></li>";
  }

  function buildDocs() {
    var programs = selectedPrograms();
    state.checked = {};

    /* 공통 */
    $("#commonCount").textContent = COMMON_DOCS.length + "종";
    $("#commonList").innerHTML = COMMON_DOCS.map(function (doc) {
      return checkRow("common", doc);
    }).join("");

    /* 사업별 */
    $("#programDocs").innerHTML = programs.map(function (p) {
      return '<section class="docgroup"><div class="docgroup__head">' +
        "<div><b>" + p.title + "</b><span> 추가 서류</span></div>" +
        '<span class="count">' + p.docs.length + "종</span></div><ul class=\"checklist\">" +
        p.docs.map(function (name) {
          return checkRow(p.id, { name: name, issuer: "사업별 추가", note: "기관 양식" });
        }).join("") +
        "</ul></section>";
    }).join("");

    /* 요약 */
    var input = state.input;
    $("#summaryList").innerHTML = [
      ["사업자등록번호", input.bizNo],
      ["대표자", (input.gender === "female" ? "여성" : "남성") + " · 만 " + input.age + "세"],
      ["업종 / 업력", INDUSTRY[input.industry] + " / " + BIZAGE[input.bizAge]],
      ["지역 / 매출", REGION[input.region] + " / " + SALES[input.sales]],
      ["상시근로자", WORKERS[input.workers]],
      ["선택 사업", programs.length + "건<small>" + programs.map(function (p) { return p.title; }).join(" · ") + "</small>"],
      ["진단일시", formatDateTime(new Date())]
    ].map(function (row) {
      return "<div><dt>" + row[0] + "</dt><dd>" + row[1] + "</dd></div>";
    }).join("");

    bindChecks();
    updateProgress();
  }

  function bindChecks() {
    $$("input[data-doc]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var key = cb.getAttribute("data-doc");
        if (cb.checked) state.checked[key] = true;
        else delete state.checked[key];
        updateProgress();
      });
    });
  }

  function updateProgress() {
    var total = $$("input[data-doc]").length;
    var done = $$("input[data-doc]:checked").length;
    $("#progressNum").textContent = done;
    $("#progressTotal").textContent = total;
    $("#progressFill").style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
  }

  /* ---------------------------------------------------------------
     8. 접수 신청 · 접수번호
     --------------------------------------------------------------- */
  var applyForm = $("#applyForm"), applyError = $("#applyError");
  var applyPhone = $("#applyPhone");

  applyPhone.addEventListener("input", function () {
    var n = applyPhone.value.replace(/\D/g, "").slice(0, 11);
    if (n.length <= 3) applyPhone.value = n;
    else if (n.length <= 7) applyPhone.value = n.slice(0, 3) + "-" + n.slice(3);
    else applyPhone.value = n.slice(0, 3) + "-" + n.slice(3, n.length - 4) + "-" + n.slice(n.length - 4);
  });

  applyForm.addEventListener("submit", function (e) {
    e.preventDefault();
    applyError.hidden = true;

    var name = $("#applyName").value.trim();
    var phone = applyPhone.value.replace(/\D/g, "");
    var agree = $("#agreePrivacy").checked;

    if (!name) return applyFail("성함을 입력해 주세요.");
    if (phone.length < 10) return applyFail("연락처를 정확히 입력해 주세요.");
    if (!agree) return applyFail("개인정보 수집·이용에 동의해 주세요.");
    var programs = selectedPrograms();
    if (!programs.length) return applyFail("서류를 준비할 사업을 먼저 선택해 주세요.");

    var no = makeReceiptNo();
    var time = $("#applyTime").value;
    var channel = $("#applyChannel").value;
    var memo = $("#applyMemo").value.trim();
    var input = state.input;

    $("#receiptNo").textContent = no;
    $("#receiptMeta").innerHTML = [
      ["접수자", name],
      ["연락처", formatPhone(phone)],
      ["희망 상담 시간", time],
      ["상담 방식", channel],
      ["사업자등록번호", input.bizNo],
        ["선택 사업", programs.length + "건"]
    ].map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("");

    var text =
      "[아성 AI 비즈패스 접수]\n" +
      "접수번호: " + no + "\n" +
      "성함: " + name + "\n" +
      "연락처: " + formatPhone(phone) + "\n" +
      "사업자등록번호: " + input.bizNo + "\n" +
      "대표자: " + (input.gender === "female" ? "여성" : "남성") + " / 만 " + input.age + "세\n" +
      "업종: " + INDUSTRY[input.industry] + " / 업력 " + BIZAGE[input.bizAge] + "\n" +
      "지역: " + REGION[input.region] + " / 연매출 " + SALES[input.sales] + " / 근로자 " + WORKERS[input.workers] + "\n" +
      "선택 사업:\n" + programs.map(function (p, i) {
        return "  " + (i + 1) + ". " + p.title + " (" + p.limit + ")";
      }).join("\n") + "\n" +
      "희망 상담: " + time + " / " + channel + "\n" +
      (memo ? "요청사항: " + memo + "\n" : "") +
      "진단일시: " + formatDateTime(new Date());

    $("#receiptText").textContent = text;
    $("#receiptSms").setAttribute("href", "sms:01028292837?body=" + encodeURIComponent(text));
    $("#receiptPanel").hidden = false;
    $("#applyCard").hidden = true;
    setTimeout(function () {
      $("#receiptPanel").scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  });

  function applyFail(msg) {
    applyError.textContent = msg;
    applyError.hidden = false;
  }

  function makeReceiptNo() {
    var ymd = String(TODAY.getFullYear()) +
      String(TODAY.getMonth() + 1).padStart(2, "0") +
      String(TODAY.getDate()).padStart(2, "0");
    var rand = String(Math.floor(Math.random() * 9000) + 1000);
    return "BP-" + ymd + "-" + rand;
  }

  function formatPhone(n) {
    n = String(n).replace(/\D/g, "");
    if (n.length === 11) return n.slice(0, 3) + "-" + n.slice(3, 7) + "-" + n.slice(7);
    if (n.length === 10) return n.slice(0, 3) + "-" + n.slice(3, 6) + "-" + n.slice(6);
    return n;
  }

  function formatDateTime(date) {
    var p = function (v) { return String(v).padStart(2, "0"); };
    return date.getFullYear() + "-" + p(date.getMonth() + 1) + "-" + p(date.getDate()) +
      " " + p(date.getHours()) + ":" + p(date.getMinutes());
  }

  $("#receiptCopy").addEventListener("click", function () {
    var btn = this;
    var text = $("#receiptText").textContent;
    var done = function () {
      btn.textContent = "복사 완료";
      setTimeout(function () { btn.textContent = "내용 복사"; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  });

  function fallbackCopy(text, cb) {
    var ta = d.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    d.body.appendChild(ta);
    ta.select();
    try { d.execCommand("copy"); } catch (e) { /* ignore */ }
    d.body.removeChild(ta);
    cb();
  }

  /* ---------------------------------------------------------------
     9. 지원사업 풀 렌더
     --------------------------------------------------------------- */
  var poolList = $("#poolList");
  var poolCat = "all";

  function renderPool() {
    $("#statCount").textContent = PROGRAMS.length;
    poolList.innerHTML = PROGRAMS.filter(function (p) {
      return poolCat === "all" || p.cat === poolCat;
    }).map(function (p) {
      var focusLabel = p.focus === "youth" ? "청년" : p.focus === "women" ? "여성" : p.focus === "senior" ? "고령자" : "공통";
      var condText = condSummary(p);
      return '<article class="pcard">' +
        '<div class="pcard__top"><span class="pcard__cat">' + p.catLabel + "</span>" +
        '<span class="pcard__focus" data-f="' + p.focus + '">' + focusLabel + "</span></div>" +
        "<h3>" + p.title + "</h3>" +
        '<p class="pcard__agency">' + p.agency + "</p>" +
        "<dl>" +
          "<div><dt>한도</dt><dd>" + p.limit + " <br><small>" + p.limitNote + "</small></dd></div>" +
          "<div><dt>조건</dt><dd>" + p.rate + "</dd></div>" +
          "<div><dt>대상</dt><dd>" + condText + "</dd></div>" +
        "</dl>" +
        '<p class="pcard__foot">추가 서류 ' + p.docs.length + "종 · " + p.caveat + "</p></article>";
    }).join("");
  }

  function condSummary(p) {
    var c = p.cond || {}, out = [];
    if (c.gender) out.push("여성 대표");
    if (c.ageMax != null) out.push("만 " + c.ageMax + "세 이하");
    if (c.ageMin != null) out.push("만 " + c.ageMin + "세 이상");
    if (c.bizAge) out.push(c.bizAge.map(function (k) { return BIZAGE[k]; }).join("·"));
    if (c.industry) out.push(c.industry.map(function (k) { return INDUSTRY[k].replace("·", ""); }).join("·"));
    if (c.region) out.push(c.region.map(function (k) { return REGION[k]; }).join("·") + " 사업장");
    if (c.workersMax != null) out.push("근로자 " + c.workersMax + "명 이하");
    if (c.salesMax != null) out.push("연매출 " + c.salesMax + "억 원 이하");
    return out.length ? out.join(" / ") : "업종·지역 제한 없음";
  }

  $$("#poolFilters .filter").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$("#poolFilters .filter").forEach(function (b) {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      poolCat = btn.getAttribute("data-cat");
      renderPool();
    });
  });

  renderPool();

  /* ---------------------------------------------------------------
     10. Reveal 애니메이션
     --------------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  updateAgeBand();
})();
