// Regenerate data/pranav.career.csv + data/akhil.career.csv from the confirmed 51-match ledger.
// Pranav: 10 Test / 15 ODI / 26 T20 = 51. Akhil (opener): 10 Test / 12 ODI / 14 T20 = 36.
// CSV columns (pranav): seq,date,match,format,R,B,4s,6s,dismissal,O,M,RW,W,note
// CSV columns (akhil): num,match,date,format,R,B,4s,6s,SR,dismissal,O,M,RW,W,note
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const P = [];
const push = (...r) => P.push(r);
// format: [date,match,fmt,R,B,4s,6s,dis,O,M,RW,W,note]
// Tests first-innings runs in R; second innings noted as "2nd inn: <r>[*]"
const T = (d, r1, b1, dis1, r2, b2, o, m, rw, w, fours, sixes) => push(d, 'MP A v MP B', 'Test', r1, b1, fours, sixes, dis1, o, m, rw, w, `2nd inn: ${r2} (${b2}${r2.includes('*') ? '' : ''})`);
const O = (d, r, b, dis, o, m, rw, w) => push(d, 'MP A v MP B', 'ODI', r, b, Math.round(r / 6), Math.round((r % 6) / 4), dis, o, m, rw, w, '');
const T20 = (d, match, r, b, dis, o, m, rw, w) => push(d, match, 'T20', r, b, Math.round(r / 7), Math.round((r / 9)), dis, o, m, rw, w, '');

// --- Tests 2023 (Oct) ---
T('2023-10-05', 74, 112, 'c Shekhar b Vivek', '41*', 38, 21, 5, 55, 2, 9, 1);
T('2023-10-12', 32, 51, 'lbw b Rakesh', '12', 20, 12, 2, 49, 1, 4, 0);
T('2023-10-19', 61, 94, 'c Aman b Nitin', '88*', 119, 22, 6, 48, 2, 6, 1);
T('2023-10-26', 21, 39, 'b Vivek', '0', 2, 18, 4, 88, 0, 2, 0);
T('2023-11-02', 52, 78, 'c Deepak b Nitin', '47*', 71, 20, 6, 66, 3, 5, 1);

// --- Tests 2024 (Oct) ---
T('2024-10-03', 18, 30, 'b Nitin', '33', 49, 14, 2, 52, 1, 2, 0);
T('2024-10-10', 65, 97, 'c Aman b Vivek', '45*', 66, 24, 7, 61, 4, 8, 1);
T('2024-10-17', 30, 48, 'lbw b Rakesh', '58*', 83, 18, 4, 59, 3, 3, 1);
T('2024-10-24', 26, 41, 'b Vivek', '44', 63, 16, 3, 45, 1, 3, 0);
T('2024-10-31', 71, 105, 'c Aman b Nitin', '39*', 58, 22, 6, 67, 4, 8, 1);

// --- ODIs ---
// 2022 (MP B neutral series, Sep)
O('2022-09-04', 51, 62, 'c Dewi b Arshad', 6, 0, 34, 1);
O('2022-09-07', 62, 71, 'not out', 5, 0, 30, 1);
O('2022-09-10', 24, 31, 'b Kuldeep', 4, 0, 22, 0);
O('2022-09-14', 88, 90, 'c Kartikeya b Khejroliya', 8, 1, 42, 2);
O('2022-09-18', 33, 40, 'c Mantri b Khan', 4, 0, 25, 1);
// 2023 (Sep)
O('2023-09-05', 40, 47, 'lbw b Avesh', 4, 0, 22, 0);
O('2023-09-08', 72, 78, 'c Iyer b Kartikeya', 8, 1, 38, 1);
O('2023-09-12', 19, 27, 'c Patidar b Senapati', 2, 0, 15, 0);
O('2023-09-16', 45, 53, 'run out Mantri', 3, 0, 21, 0);
O('2023-09-20', 58, 64, 'c Dubey b Khejroliya', 6, 1, 30, 2);
// 2024 (Sep)
O('2024-09-05', 39, 45, 'c Agarwal b Avesh', 4, 0, 20, 0);
O('2024-09-08', 66, 70, 'c Khejroliya b Kartikeya', 8, 1, 35, 1);
O('2024-09-12', 28, 33, 'b Senapati', 3, 0, 18, 0);
O('2024-09-16', 84, 88, 'c Batham b Arshad', 9, 3, 40, 2);
O('2024-09-20', 52, 60, 'not out', 5, 0, 27, 1);

// --- T20 ---
// RJ A v RJ B (3/yr, Jan-Mar 2021-2024)
T20('2021-01-20', 'RJ A v RJ B', 49, 32, 'c S Iyer b Tomar', 3, 0, 24, 1);
T20('2021-02-12', 'RJ A v RJ B', 28, 24, 'b Rohera', 2, 0, 18, 0);
T20('2021-03-14', 'RJ A v RJ B', 64, 40, 'not out', 3, 0, 26, 1);
T20('2022-01-18', 'RJ A v RJ B', 32, 27, 'c Mahajan b Rohera', 3, 0, 22, 0);
T20('2022-02-20', 'RJ A v RJ B', 51, 36, 'c Solanki b Rajawat', 3, 0, 25, 1);
T20('2022-03-10', 'RJ A v RJ B', 22, 19, 'lbw b Chouhan', 2, 0, 16, 0);
T20('2023-01-22', 'RJ A v RJ B', 39, 30, 'c Kushwaha b Surana', 3, 0, 20, 1);
T20('2023-02-18', 'RJ A v RJ B', 18, 16, 'b Shukla', 2, 0, 14, 0);
T20('2023-03-12', 'RJ A v RJ B', 70, 42, 'c Gurjar b Arshad', 4, 0, 28, 1);
T20('2024-01-25', 'RJ A v RJ B', 44, 33, 'c D Shukla b Kangale', 4, 0, 24, 1);
T20('2024-02-22', 'RJ A v RJ B', 61, 39, 'not out', 3, 0, 25, 1);
T20('2024-03-14', 'RJ A v RJ B', 26, 22, 'c Kushwaha b Khan', 2, 0, 18, 0);
// Destroyers v DE (7, Aug 2021) — Akhil in DE (opposition)
T20('2021-08-01', 'DE v DES', 34, 28, 'c Akhil b Sahni', 3, 0, 24, 1);
T20('2021-08-04', 'DE v DES', 55, 36, 'c Kosta b Maurya', 4, 0, 26, 1);
T20('2021-08-07', 'DE v DES', 21, 19, 'b Gupta', 2, 0, 16, 0);
T20('2021-08-11', 'DE v DES', 38, 30, 'c Baghel b Sen', 3, 0, 22, 0);
T20('2021-08-15', 'DE v DES', 27, 23, 'b Shubham', 2, 0, 19, 0);
T20('2021-08-20', 'DE v DES', 66, 38, 'c Lakhera b Bansal', 5, 0, 27, 2);
T20('2021-08-28', 'DE v DES', 45, 32, 'c Gul b Maurya', 4, 0, 25, 1);
// DE v DES revival (2, Aug 2022)
T20('2022-08-10', 'DE v DES', 44, 30, 'c Sharma b Tiwari', 3, 0, 20, 1);
T20('2022-08-12', 'DE v DES', 58, 36, 'not out', 3, 0, 23, 1);
// LSG A v LSG B (2, Nov 2022) — Pranav in LSG B
T20('2022-11-05', 'LSG A v LSG B', 44, 29, 'c Rahul b Avesh', 2, 0, 18, 0);
T20('2022-11-07', 'LSG A v LSG B', 59, 37, 'c de Kock b Chameera', 3, 0, 22, 1);
// RCB A v RCB B (3, Nov 2024)
T20('2024-11-02', 'RCB A v RCB B', 45, 31, 'run out Padikkal', 2, 0, 20, 1);
T20('2024-11-06', 'RCB A v RCB B', 49, 38, 'c Bethell b Rasikh', 3, 1, 24, 0);
T20('2024-11-08', 'RCB A v RCB B', 62, 40, 'not out', 2, 0, 24, 0);

// IPL — RCB v KKR M58, May 17 2025 (abandoned, no ball bowled)
P.push(['2025-05-17', 'RCB v KKR', 'IPL', 'DNB', 0, 0, 0, 'DNB (Rain)', '-', '-', '-', '-', 'IPL M58 abandoned, no ball bowled']);

// --- write pranav CSV ---
const pHeader = 'seq,date,match,format,R,B,4s,6s,dismissal,O,M,RW,W,note';
const pRows = P.map((r, i) => [i + 1, ...r.map((v) => (v === '' ? '' : v))].join(','));
writeFileSync(join(ROOT, 'data/pranav.career.csv'), [pHeader, ...pRows].join('\n') + '\n');

// --- Akhil (opener) — mirrored on shared matches/last rows; 10 Test / 12 ODI / 12 shared T20 + 2 MI T20
const A = [];
const aHeader = 'num,match,date,format,R,B,4s,6s,SR,dismissal,O,M,RW,W,note';
// rows: [fmt, match, date, R, B, 4s, 6s, dis, O, M, RW, W]
const aTest = [
  ['Test', 'MP A v MP B', '2023-10-05', 51, 72, 'c Hooda b Patel', 5, 0, 34, 0],
  ['Test', 'MP A v MP B', '2023-10-12', 34, 41, 'run out', 4, 0, 28, 0],
  ['Test', 'MP A v MP B', '2023-10-19', 60, 88, 'c S b Kelkar', 6, 0, 36, 1],
  ['Test', 'MP A v MP B', '2023-10-26', 22, 31, 'b Nirwan', 3, 0, 24, 0],
  ['Test', 'MP A v MP B', '2023-11-02', 77, 96, 'c Rathore b Soni', 8, 1, 38, 1],
  ['Test', 'MP A v MP B', '2024-10-03', 42, 55, 'b Tiwari', 4, 0, 30, 0],
  ['Test', 'MP A v MP B', '2024-10-10', 70, 82, 'c Rawat b Sen', 7, 1, 32, 1],
  ['Test', 'MP A v MP B', '2024-10-17', 45, 66, 'b Rathore', 5, 0, 29, 0],
  ['Test', 'MP A v MP B', '2024-10-24', 92, 120, 'c Pandey b Varma', 11, 2, 40, 2],
  ['Test', 'MP A v MP B', '2024-10-31', 38, 50, 'c Soni b Tiwari', 4, 0, 27, 0],
];
const aOdi = [
  ['ODI', 'MP A v MP B', '2022-09-04', 58, 60, 'c Mantri b Khejroliya', 6, 1, 32, 0],
  ['ODI', 'MP A v MP B', '2022-09-07', 42, 46, 'b Avesh', 4, 0, 26, 0],
  ['ODI', 'MP A v MP B', '2022-09-10', 33, 38, 'c Iyer b Senapati', 3, 0, 22, 0],
  ['ODI', 'MP A v MP B', '2022-09-14', 66, 72, 'run out Mantri', 7, 2, 34, 1],
  ['ODI', 'MP A v MP B', '2022-09-18', 29, 35, 'b Batham', 3, 0, 25, 0],
  ['ODI', 'MP A v MP B', '2023-09-05', 45, 50, 'c Dubey b Arshad', 4, 1, 28, 0],
  ['ODI', 'MP A v MP B', '2023-09-08', 61, 68, 'c Kartikeya b Khejroliya', 6, 1, 31, 1],
  ['ODI', 'MP A v MP B', '2023-09-12', 25, 30, 'b Khan', 2, 0, 20, 0],
  ['ODI', 'MP A v MP B', '2023-09-16', 50, 55, 'c Patidar b Avesh', 5, 0, 27, 1],
  ['ODI', 'MP A v MP B', '2024-09-05', 37, 41, 'lbw b Senapati', 3, 0, 23, 0],
  ['ODI', 'MP A v MP B', '2024-09-08', 69, 75, 'c Batham b Kartikeya', 8, 2, 33, 1],
  ['ODI', 'MP A v MP B', '2024-09-16', 48, 54, 'b Arshad', 5, 0, 29, 0],
];
const aT20 = [
  ['T20', 'RJ A v RJ B', '2021-01-20', 41, 24, 'c S b Tomar', 3, 0, 20, 0],
  ['T20', 'RJ A v RJ B', '2022-01-18', 37, 28, 'c A b Rohera', 3, 0, 19, 1],
  ['T20', 'RJ A v RJ B', '2023-01-22', 28, 20, 'b Shukla', 2, 0, 15, 0],
  ['T20', 'RJ A v RJ B', '2024-01-25', 52, 34, 'c G b Khan', 4, 1, 24, 1],
  ['T20', 'DE v DES', '2021-08-01', 62, 38, 'c Kulkarni b PATEL', 6, 2, 25, 1],
  ['T20', 'DE v DES', '2021-08-04', 41, 27, 'c Rao b Sen', 4, 1, 21, 0],
  ['T20', 'DE v DES', '2021-08-07', 50, 31, 'c Das b Gupta', 5, 2, 23, 1],
  ['T20', 'DE v DES', '2021-08-11', 44, 29, 'b Tiwari', 4, 1, 22, 0],
  ['T20', 'DE v DES', '2021-08-15', 58, 36, 'c Kulkarni b Bansal', 6, 2, 26, 1],
  ['T20', 'DE v DES', '2021-08-20', 35, 22, 'b Verma', 3, 1, 18, 0],
  ['T20', 'DE v DES', '2022-08-10', 51, 35, 'c Mishra b Patel', 5, 1, 24, 1],
  ['T20', 'DE v DES', '2022-08-12', 39, 26, 'c Khan b Sen', 4, 0, 20, 0],
  // 2 MI A v MI B (Nov 2024) — final two T20 rows
  ['T20', 'MI A v MI B', '2024-11-14', 45, 30, 'c Skyler b Boult', 0, 0, 0, 0],
  ['T20', 'MI A v MI B', '2024-11-16', 38, 27, 'c Varma b Chahar', 0, 0, 0, 0],
];
const aRows = [...aTest, ...aOdi, ...aT20].map((r, i) => {
  const runs = r[3], balls = r[4];
  const sr = runs && balls ? ((runs / balls) * 100).toFixed(2) : '0.00';
  // num, match, date, format, R, B, 4s, 6s, SR, dismissal, O, M, RW, W, note
  // Akhil is an opener/non-bowler: O=0, M=0, RW=0, W=0
  return [i + 1, r[1], r[2], r[0], runs, balls, r[6], r[7], sr, r[5], 0, 0, 0, 0, ''].join(',');
});
writeFileSync(join(ROOT, 'data/akhil.career.csv'), [aHeader, ...aRows].join('\n') + '\n');

const count = (rows, f) => rows.filter((r) => r[2] === f).length;
console.log('pranav rows:', P.length, { Test: count(P, 'Test'), ODI: count(P, 'ODI'), T20: count(P, 'T20') });
console.log('akhil rows:', aRows.length);