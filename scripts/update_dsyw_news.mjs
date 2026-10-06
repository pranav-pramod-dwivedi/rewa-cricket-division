import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dsywPath = join(__dirname, '..', 'data', 'dsyw.json');
const dsyw = JSON.parse(readFileSync(dsywPath, 'utf8'));

const newPressReleases = [
  {
    date: '26-09-2026',
    title: 'Aashi Chouksey Wins Silver for India at Asian Games 2026 in 50m Rifle 3 Positions Team Event. Madhya Pradesh State Shooting Academy Shooter Secures Second Consecutive Asian Games Silver.'
  },
  {
    date: '25-09-2026',
    title: 'Aishwary Pratap Singh Tomar Wins Silver for India at Asian Games 2026. MP State Shooting Academy Shooter Shines in 50m Rifle 3 Positions Team Event.'
  },
  {
    date: '23-09-2026',
    title: 'Madhya Pradesh’s Jay Meena Creates History at Asian Games 2026 with Bronze Medal in Soft Tennis. Becomes the First Indian to Win an Asian Games Medal in Soft Tennis Men’s Singles.'
  },
  {
    date: '04-09-2026',
    title: 'Krishna Chandra Sets New Meet Record at National Youth Athletics Championship 2026. Shivani Patel Wins Bronze in Javelin Throw as MP State Athletics Academy Shines.'
  },
  {
    date: '04-09-2026',
    title: 'Indian Shooting Team Begins Final Asian Games 2026 Preparation Camp in Bhopal. 18 Top Shooters Join 36-Member Squad at MP State Shooting Academy from September 5–14.'
  },
  {
    date: '03-09-2026',
    title: 'MP Athletes Shine at National Youth Athletics Championship 2026 with Two Gold and One Bronze. Krishna Chandra Sets New Meet Record in Javelin Throw as Nagar Singh Kanesh Wins Heptathlon Gold.'
  },
  {
    date: '23-08-2026',
    title: '32 Athletes from Madhya Pradesh to Represent India at Asian Games 2026. 25 Academy Athletes Set to Compete Across 10 Sports Disciplines in Aichi-Nagoya.'
  },
  {
    date: '21-08-2026',
    title: 'MP Triathlon Athletes Shine at National ITF Triathlon Championships in Pune. Athletes Secure Four Medals, Including Two Silver, Across National-Level Competitions.'
  },
  {
    date: '13-08-2026',
    title: 'Madhya Pradesh Sailors Shine at Raja Bhoj National Sailing Championship 2026. Vasu Chandravanshi and Mahi Verma Lead MP’s Strong Performance Across Multiple Classes.'
  },
  {
    date: '12-08-2026',
    title: 'MP Sailors Shine at Raja Bhoj National Sailing Championship 2026 in Bhopal. Samriddhi Batham–Parth Singh Chauhan Pair Tops 420 MIX as MP Sailors Excel Across Classes.'
  },
  {
    date: '08-08-2026',
    title: 'Madhya Pradesh’s Khushi Dabhade Selected for Indian Fencing Team at Senior Commonwealth Championship 2026. MP State Fencing Academy Athlete to Represent India in Women’s Épée in Nigeria.'
  },
  {
    date: '08-08-2026',
    title: 'Khushi Dabhade Wins Silver Medal at Senior Commonwealth Fencing Championship 2026. MP State Fencing Academy Athlete Shines in Women’s Épée Individual Event in Nigeria.'
  }
];

const existingTitles = new Set(dsyw.pressReleases.map((p) => p.title));
const combinedPR = [...newPressReleases.filter((p) => !existingTitles.has(p.title)), ...dsyw.pressReleases];
dsyw.pressReleases = combinedPR;

const newWhatsNew = [
  {
    title: 'Coach Recruitment for Khelo India Small Centres',
    body: 'MP Sports & Youth Welfare Department Announces Coach Recruitment for Khelo India Small Centres — Apply by July 31, 2026'
  },
  {
    title: 'High-Tech Expert Coaches & Sports Science Specialists',
    body: 'MP Directorate of Sports & Youth Welfare Invites Applications for High-Tech Expert Coaches & Sports Science Specialists (Psychologist, Physiotherapist, S&C Expert) Across 8 Sports Academies — Apply April 8 to 22, 2026'
  },
  {
    title: 'Khiladi-Prashikshak Kalyan Samiti — 9 Contract Posts',
    body: "Khiladi-Prashikshak Kalyan Samiti, TT Nagar Stadium Bhopal Invites Applications for 9 Contract Posts Including Volleyball Coach, Fitness Trainers & Support Staff Under 'Pay & Play' Scheme — Apply by April 9, 2026"
  },
  {
    title: 'KISCE Coaches & Sports Science Specialists Selection',
    body: 'Madhya Pradesh Directorate of Sports and Youth Welfare Invites Contract-Based Applications for Coaches(Rifle, Shotgun & Rowing) and Sports Science Experts(Strength & Conditioning, Masseur) Under Khelo India State Center of Excellence(KISCE) — Apply by 8 April 2026'
  },
  {
    title: 'Khelo India Small Centres Coaches Advertisement Notice',
    body: 'Directorate of Sports and Youth Welfare, Madhya Pradesh Issues Notice for Publication of Advertisement Inviting Applications for Coaches in Khelo India Small Centres Across Multiple Sports Disciplines'
  },
  {
    title: 'Global EOI: International Transport for Warmblood Horse to London',
    body: 'Directorate of Sports and Youth Welfare, Madhya Pradesh Invites Global EOIs for International Air Transport of a Warmblood Horse from Delhi to London for Elite Equestrian Training and Competition, with Submissions Open Until 4 March 2026'
  },
  {
    title: 'Khelo Madhya Pradesh Youth Games (KMPYG) 2025 Coordination Circular',
    body: 'Khelo Madhya Pradesh Youth Games–2025: Official Circular Issued Detailing Event Coordination, Responsibilities, and Operational Framework for Smooth State-Level Execution'
  },
  {
    title: 'KMPYG-2025 Administrative Guidelines & Instructions',
    body: 'Official KMPYG–2025 Letter Issued, Laying Out Key Administrative Instructions for the Organisation and Management of the Khelo Madhya Pradesh Youth Games'
  },
  {
    title: 'State Tournament Directors & GTCC Members Across 28 Sports Finalised',
    body: 'Madhya Pradesh Finalises Tournament Directors and GTCC Members Across 28 Sports Disciplines, Releasing Comprehensive Annexure of Officials, Associations, and Contact Details for State-Level Sporting Events'
  },
  {
    title: 'VBYLD 2026 — Round Four National Championship Selected Students',
    body: 'VBYLD 2026 - List of Selected Students for Round Four (National Championship)'
  },
  {
    title: 'High-Performance Coaching and Sports Science Specialists Selection',
    body: 'Department of Sports and Youth Welfare — Advertisement for High-Performance Coaching and Sports Science Specialists (Applications Open from October 14, 2025 to October 28, 2025)'
  },
  {
    title: 'Equestrian Academy Bhopal: EOI for European & National Competitions',
    body: 'Madhya Pradesh Sports and Youth Welfare Directorate Invites Comprehensive Expressions of Interest (EOI) for Sending Two Selected Horses from the State Equestrian Academy, Bhopal to National/International Competitions Including New Delhi and Europe – Applications Open Until 26 November 2025'
  }
];
dsyw.whatsNew = newWhatsNew;

dsyw.importantEvents = [
  {
    title: 'Talent Search 2026',
    body: 'It identifies young athletes across the state through district and state-level trials, offering selected players entry into elite State Sports Academies for professional training'
  },
  {
    title: 'Indusind Bank Skill Development',
    body: 'Skill development training is being conducted in Shivpuri under the joint aegis of Induslnd Bank and the department. to the youth'
  },
  {
    title: 'Army to the youth of the state',
    body: 'MP by the department youth of the armed forces for greater participation in the paramilitary forces and in the armed forces'
  },
  {
    title: 'Youth encouraged to climb Mount Everest',
    body: 'A certificate of successful completion of the summit by an organization authorized to climb Mount Everest.'
  },
  {
    title: 'Aaroh Summer Camp 2026',
    body: 'The duration of summer camp is about 1 month from 1st May to 30th May in which more than 1 lakh boys and girls participate.'
  },
  {
    title: 'Maa Tujhe Pranaam',
    body: 'Under this scheme, the Madhya Pradesh government selects the youth of the state every year and makes them travel to the borders of India.'
  },
  {
    title: 'CM Cup',
    body: 'Block, district for identification of talented boys and girls players below 16 years of age in all the districts of Madhya Pradesh'
  },
  {
    title: 'Award Rules',
    body: 'State government, financial assistance to sports organizations and players, Sports career, Samman Nidhi Rules, 2006 which Madhya Pradesh Gazette (Extraordinary)'
  },
  {
    title: 'Anudaan Niyam',
    body: 'Madhya Pradesh Government Sports and Youth Welfare Department dated April 5, 2005 "Award Rules Vikram Eklavya and Vishwamitra"'
  },
  {
    title: 'DSYW-VLCC Academy',
    body: 'With the help of VLCC, employment-oriented with the aim of providing better employment opportunities to the youth of the state in the field of beauty and fitness.'
  },
  {
    title: 'Eicher Volvo - Skill Development Training',
    body: 'Skill development training is being conducted in Shivpuri under the joint aegis of Eicher Volvo and the department. this employment oriented'
  },
  {
    title: 'Skill Development Training in Indore - ICICI',
    body: 'Skill development training is being conducted in Indore under the joint aegis of ICICI and the department. job oriented training'
  }
];

dsyw.sportsScience = 'The Sports Science Centre, TT Nagar Stadium, Directorate of Sports and Youth Welfare (DSYW), caters to all the Elite Sports Academies run by the Sports and Youth Welfare Department, Government of M.P. The Sports Medicine Centre was established in 2006-2007.';

if (!dsyw.academy.gallery.some((g) => g.src.includes('Cricket_award.png'))) {
  dsyw.academy.gallery.push({
    src: '/img/academy/Cricket_award.png',
    alt: "MP State Women's Cricket Academy of Excellence, Shivpuri — awards and recognition"
  });
}

writeFileSync(dsywPath, JSON.stringify(dsyw, null, 2));
console.log('Updated dsyw.json successfully.');
