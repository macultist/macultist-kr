// 실수령액 계산. 근거와 원문 주소는 docs/수치검증.md
(function (g) {
  var R = {
    year: 2027,
    pension: 0.05, pensionMin: 410000, pensionMax: 6590000,   // 국민연금 2027 근로자 5.0%, 기준소득월액 2026-07 ~ 2027-06
    health: 0.0719 / 2, healthCapTotal: 9183480,             // 건강보험 2027 7.19% 동결, 월 보험료 상한은 2026 고시(2027 발표 전)
    care: 0.009994 / 2,                                      // 장기요양 2027 소득 대비 0.9994%
    employ: 0.009                                            // 고용보험 근로자 0.9% (2027 인상안 1.0%는 발표 전)
  };
  var floor10 = function (x) { return Math.floor(Math.round(x * 100) / 1000) * 10; }; // 소수 오차 없앤 뒤 10원 미만 버림

  // 간이세액표 세액(원). pay: 비과세 뺀 월급여(원), fam: 공제대상가족 수(본인 포함)
  function tableTax(pay, fam) {
    var T = g.TAX_TABLE, k = pay / 1000;
    if (fam > 11) return Math.max(0, tableTax(pay, 11) - (tableTax(pay, 10) - tableTax(pay, 11)) * (fam - 11)); // 별표 2 제4호
    if (k < T[0][0]) return 0;
    if (k > 10000) {
      var b = T[T.length - 1][1 + fam], x = pay - 10000000;
      if (k <= 14000) return Math.floor(b + x * 0.98 * 0.35 + 25000);
      if (k <= 28000) return Math.floor(b + 1397000 + (pay - 14000000) * 0.98 * 0.38);
      if (k <= 30000) return Math.floor(b + 6610600 + (pay - 28000000) * 0.98 * 0.40);
      if (k <= 45000) return Math.floor(b + 7394600 + (pay - 30000000) * 0.40);
      if (k <= 87000) return Math.floor(b + 13394600 + (pay - 45000000) * 0.42);
      return Math.floor(b + 31034600 + (pay - 87000000) * 0.45);
    }
    for (var i = 0; i < T.length; i++) if (k >= T[i][0] && (k < T[i][1] || T[i][0] === T[i][1])) return T[i][1 + fam];
    return 0;
  }

  // 8~20세 자녀 공제 (별표 2 제3호)
  function childCut(n) { return n <= 0 ? 0 : n === 1 ? 20830 : 45830 + (n - 2) * 33330; }

  // gross: 세전 월급(비과세 포함), free: 월 비과세액, fam, kids, rate: 80|100|120
  function takeHome(gross, free, fam, kids, rate) {
    var pay = Math.max(0, gross - free);
    var base = Math.min(Math.max(Math.floor(pay / 1000) * 1000, R.pensionMin), R.pensionMax);
    var pension = floor10(base * R.pension);
    var health = floor10(Math.min(pay * 0.0719, R.healthCapTotal) / 2);
    var care = floor10(pay * R.care);
    var employ = floor10(pay * R.employ);
    var tax = floor10(Math.max(0, tableTax(pay, fam) - childCut(kids)) * rate / 100);
    var local = floor10(tax * 0.1);
    var cut = pension + health + care + employ + tax + local;
    return { pay: pay, pension: pension, health: health, care: care, employ: employ, tax: tax, local: local, cut: cut, net: gross - cut };
  }

  g.Salary = { R: R, tableTax: tableTax, childCut: childCut, takeHome: takeHome };
})(typeof window !== 'undefined' ? window : globalThis);
