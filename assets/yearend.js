// 연말정산 계산 (2026 귀속). 근거: docs/수치검증.md 6절, 7절. 금액 단위는 원
(function (g) {
  var M = 10000, fl = Math.floor;
  function step(x, rows) {   // rows: [구간 끝, 누적액, 세율]. 누진표 공통
    var lo = 0;
    for (var i = 0; i < rows.length; i++) { if (x <= rows[i][0]) return fl(rows[i][1] + (x - lo) * rows[i][2]); lo = rows[i][0]; }
  }
  // 근로소득공제: 소득세법 제47조, 한도 2,000만
  function earnedDeduction(gross) {
    return Math.min(2000 * M, step(gross, [[500 * M, 0, .7], [1500 * M, 350 * M, .4], [4500 * M, 750 * M, .15], [10000 * M, 1200 * M, .05], [Infinity, 1475 * M, .02]]));
  }
  // 세율: 소득세법 제55조
  function tax(base) {
    return step(base, [[1400 * M, 0, .06], [5000 * M, 84 * M, .15], [8800 * M, 624 * M, .24], [15000 * M, 1536 * M, .35],
      [30000 * M, 3706 * M, .38], [50000 * M, 9406 * M, .40], [100000 * M, 17406 * M, .42], [Infinity, 38406 * M, .45]]);
  }
  // 근로소득세액공제: 소득세법 제59조
  function earnedCredit(gross, t) {
    var c = t <= 130 * M ? t * .55 : 71.5 * M + (t - 130 * M) * .3;
    var lim = gross <= 3300 * M ? 74 * M
      : gross <= 7000 * M ? Math.max(66 * M, 74 * M - (gross - 3300 * M) * .008)
      : gross <= 12000 * M ? Math.max(50 * M, 66 * M - (gross - 7000 * M) * .5)
      : Math.max(20 * M, 50 * M - (gross - 12000 * M) * .5);
    return fl(Math.min(c, lim));
  }
  // 자녀세액공제: 소득세법 제59조의2 (2026 귀속 9세 이상)
  function childCredit(n) { return n <= 0 ? 0 : n === 1 ? 25 * M : 55 * M + (n - 2) * 40 * M; }
  // 신용카드 등 소득공제: 조특법 제126조의2. 문턱은 신용카드, 체크카드와 현금영수증, 전통시장과 대중교통 순으로 채움
  function cardDeduction(gross, credit, debit, market, kids) {
    var rem = gross * .25, a, b, c;
    a = Math.max(0, credit - rem); rem = Math.max(0, rem - credit);
    b = Math.max(0, debit - rem); rem = Math.max(0, rem - debit);
    c = Math.max(0, market - rem) * .4;
    var sum = a * .15 + b * .3 + c, low = gross <= 7000 * M, k = Math.min(kids, 2);
    var basic = (low ? [300, 350, 400] : [250, 275, 300])[k] * M;
    return fl(Math.min(sum, basic) + Math.min(Math.max(0, sum - basic), (low ? 300 : 200) * M, c));
  }
  // 월세 세액공제: 조특법 제95조의2. paid 한 해 낸 월세
  function rentCredit(gross, paid) {
    var rate = gross <= 5500 * M ? 17 : gross <= 8000 * M ? 15 : 0;
    var base = Math.min(Math.max(0, paid), 1000 * M);
    return { rate: rate, base: base, credit: fl(base * rate / 100) };
  }
  // 4대보험료 추정(2026년 요율). ponytail: 국민연금 상한을 한 해 내내 659만 원으로 봄, 정확히는 명세서 합계를 넣음
  function insurance(gross) { return fl(Math.min(gross, 659 * M * 12) * .0475 + gross * (.03595 + .004724 + .009)); }
  // o: gross, fam(기본공제 인원), kids(9~20세 자녀), ins, credit, debit, market, rent, other(그 밖의 세액공제), paid(이미 낸 소득세)
  function settle(o) {
    var r = { earned: earnedDeduction(o.gross), basic: o.fam * 150 * M, ins: o.ins };
    r.card = cardDeduction(o.gross, o.credit, o.debit, o.market, o.kids);
    r.base = Math.max(0, o.gross - r.earned - r.basic - r.ins - r.card);
    r.tax = tax(r.base);
    r.earnedCredit = earnedCredit(o.gross, r.tax);
    r.childCredit = childCredit(o.kids);
    r.rentCredit = rentCredit(o.gross, o.rent).credit;
    r.final = Math.max(0, r.tax - r.earnedCredit - r.childCredit - r.rentCredit - o.other);
    r.refund = o.paid - r.final;                 // 양수면 환급, 음수면 추가 납부
    r.refundAll = r.refund + (r.refund < 0 ? -1 : 1) * fl(Math.abs(r.refund) / 10);   // 지방소득세 10% 포함
    return r;
  }
  g.YearEnd = { earnedDeduction: earnedDeduction, tax: tax, earnedCredit: earnedCredit, childCredit: childCredit,
    cardDeduction: cardDeduction, rentCredit: rentCredit, insurance: insurance, settle: settle };
})(typeof window !== 'undefined' ? window : globalThis);
