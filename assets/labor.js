// 퇴직금, 퇴직소득세, 주휴수당, 구직급여. 근거: docs/수치검증.md 10절. 금액 단위는 원. 퇴직소득세는 yearend.js(YearEnd.tax)를 먼저 불러야 함
(function (g) {
  var M = 10000, fl = Math.floor;
  // 퇴직금: 퇴직급여법 제8조, 근로기준법 제2조. 1일 평균임금 x 30일 x 재직일수/365
  function severance(o) {   // o: {days 재직일수, wage3 3개월 임금, days3 3개월 총일수, bonus 연간 상여, leave 연차수당, ordinary 통상임금 일액}
    var avg = (o.wage3 + (o.bonus || 0) * 3 / 12 + (o.leave || 0) * 3 / 12) / o.days3;
    var daily = Math.max(avg, o.ordinary || 0);
    return { avg: fl(avg), daily: fl(daily), pay: o.days < 365 ? 0 : fl(daily * 30 * o.days / 365) };
  }
  // 퇴직소득세: 소득세법 제48조, 제55조 ②. years 근속연수(1년 미만 끝수는 올림)
  function retireTax(pay, years) {
    var n = Math.max(1, years);
    var yd = n <= 5 ? 100 * M * n : n <= 10 ? 500 * M + 200 * M * (n - 5) : n <= 20 ? 1500 * M + 250 * M * (n - 10) : 4000 * M + 300 * M * (n - 20);
    yd = Math.min(yd, pay);
    var conv = fl((pay - yd) / n * 12);
    var cd = conv <= 800 * M ? conv : conv <= 7000 * M ? 800 * M + (conv - 800 * M) * .6 : conv <= 10000 * M ? 4520 * M + (conv - 7000 * M) * .55
      : conv <= 30000 * M ? 6170 * M + (conv - 10000 * M) * .45 : 15170 * M + (conv - 30000 * M) * .35;
    var base = Math.max(0, fl(conv - cd)), tax = fl(g.YearEnd.tax(base) / 12 * n);
    return { yearsDed: yd, conv: conv, convDed: fl(cd), base: base, tax: tax, local: fl(tax / 10) };
  }
  // 주휴수당: 근로기준법 제55조, 제18조 ③, 시행령 제30조. 주 15시간 미만이거나 결근이 있으면 0
  function weeklyHoliday(hours, wage, full) {
    if (hours < 15 || !full) return 0;
    return fl(Math.min(hours, 40) / 40 * 8 * wage);
  }
  // 구직급여: 고용보험법 제45조, 제46조, 제50조 별표1, 시행령 제68조
  var MINWAGE = { 2026: 10320, 2027: 10700 }, CAP = 113500;   // 2027 상한은 발표 전, 2026 값 그대로
  var DAYS = [[120, 150, 180, 210, 240], [120, 180, 210, 240, 270]];
  function jobseeker(o) {   // o: {avgDaily 1일 평균임금, hours 1일 소정근로시간, year, older 50세 이상 또는 장애인, band 가입기간 0~4}
    var base = Math.min(o.avgDaily, CAP), floor_ = fl(MINWAGE[o.year] * (o.hours || 8) * .8);
    var calc = fl(base * .6), daily = Math.max(calc, floor_), days = DAYS[o.older ? 1 : 0][o.band];
    return { calc: calc, floor: floor_, daily: daily, days: days, total: daily * days, capped: o.avgDaily > CAP };
  }
  g.Labor = { severance: severance, retireTax: retireTax, weeklyHoliday: weeklyHoliday, jobseeker: jobseeker };
})(typeof window !== 'undefined' ? window : globalThis);
