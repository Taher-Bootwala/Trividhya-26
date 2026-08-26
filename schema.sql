-- ═══════════════════════════════════════════════════════════
-- TRIVIDHYA'26 — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════

-- 1) EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('tech','nontech','game')),
  type TEXT NOT NULL CHECK (type IN ('individual','group')),
  fee INTEGER DEFAULT 0,
  max_members INTEGER DEFAULT 1,
  logo_url TEXT,
  color TEXT DEFAULT '#7B2FBE',
  badge TEXT DEFAULT 'Tech',
  password TEXT,
  coordinators TEXT,
  volunteers TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  leader_name TEXT NOT NULL,
  leader_email TEXT NOT NULL,
  leader_mobile TEXT NOT NULL,
  college TEXT,
  enrollment TEXT,
  semester INTEGER,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('online','cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','cancelled','deleted')),
  transaction_id TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, leader_email),
  UNIQUE(event_id, leader_mobile)
);

-- 3) MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  college TEXT,
  enrollment TEXT,
  semester INTEGER
);

-- 4) ADMIN CONFIG TABLE
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  main_admin_password TEXT DEFAULT 'admin123',
  hero_title TEXT DEFAULT 'TECH-FIESTA''26',
  navbar_title TEXT DEFAULT 'TRIVIDHYA''26',
  event_dates TEXT DEFAULT 'March 23 & 25, 2026',
  event_venue TEXT DEFAULT 'GEC Dahod',
  qr_url TEXT
);

INSERT INTO admin_config (id, main_admin_password)
VALUES (1, 'admin123')
ON CONFLICT (id) DO NOTHING;

-- 5) ROW-LEVEL SECURITY (allow public read/write via anon key for this app)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Allow public access (anon key)
CREATE POLICY "Allow public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update events" ON events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete events" ON events FOR DELETE USING (true);

CREATE POLICY "Allow public read registrations" ON registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert registrations" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update registrations" ON registrations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete registrations" ON registrations FOR DELETE USING (true);

CREATE POLICY "Allow public read members" ON members FOR SELECT USING (true);
CREATE POLICY "Allow public insert members" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update members" ON members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete members" ON members FOR DELETE USING (true);

CREATE POLICY "Allow public read admin_config" ON admin_config FOR SELECT USING (true);
CREATE POLICY "Allow public update admin_config" ON admin_config FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA — All current events from the static site
-- ═══════════════════════════════════════════════════════════

-- TECHNICAL INDIVIDUAL EVENTS
INSERT INTO events (title, description, category, type, fee, max_members, logo_url, color, badge, password) VALUES
('UI/UX Designing', 'User Interface Design and User Experience Design focus on creating visually appealing and user-friendly digital products. It involves designing layouts, buttons, colors, and navigation for websites or applications. The goal is to make the product easy to use and visually attractive.', 'tech', 'individual', 30, 1, 'images/uiux_logo.png', '#FF6B35', 'Tech', 'uiuxdesigning123'),
('Reverse Coding', 'Reverse Coding is a programming challenge where participants analyze given output or logic. Players must write the correct code that produces the given result. It tests logical thinking, problem-solving, and coding skills.', 'tech', 'individual', 30, 1, 'images/revcod_logo.png', '#FF6B35', 'Tech', 'reversecoding123'),
('Vibe Coding', 'Vibe Coding is a fun coding activity focused on creativity and quick problem solving. Participants write code to create simple programs, effects, or small features. The challenge encourages innovation and coding skills.', 'tech', 'individual', 30, 1, 'images/vibecod_logo.png', '#FF6B35', 'Tech', 'vibecoding123'),
('Circuit Design', 'Circuit Design is a technical activity where participants create electronic circuits. Players design circuits using different electronic components. The activity tests technical knowledge and problem-solving skills.', 'tech', 'individual', 30, 1, 'images/circuit_logo.png', '#FF6B35', 'Tech', 'circuitdesign123'),
('Draft Master', 'Display your AutoCAD/SolidWorks mastery. Participants will recreate complex 2D/3D mechanical drawings from physical models or rough sketches under a strict time limit.', 'tech', 'individual', 30, 1, 'images/draft_logo.png', '#FF6B35', 'Tech', 'draftmaster123');

-- TECHNICAL GROUP EVENTS
INSERT INTO events (title, description, category, type, fee, max_members, logo_url, color, badge, password) VALUES
('Electric Hackathon', 'Electric Hackathon is a technical event where participants create innovative electrical or electronic solutions. Teams design and build electrical circuits or devices to solve a given problem. The event promotes creativity, technical skills, and teamwork.', 'tech', 'group', 120, 4, 'images/hack_logo.png', '#00BCD4', 'Tech', 'electrichackathon123'),
('Build & Break', 'Build & Break is a fun challenge where participants first build a structure or model using given materials. After building, teams must test or break the structure within certain rules. The activity checks creativity, strength of design, and problem-solving skills.', 'tech', 'group', 120, 4, 'images/b&b_logo.png', '#00BCD4', 'Tech', 'buildbreak123'),
('Arduino Hackathon', 'Arduino Hackathon is a technical event where participants build innovative hardware projects. Teams use Arduino boards and electronic components to create working prototypes. The event encourages creativity, problem-solving, and teamwork.', 'tech', 'group', 160, 4, 'images/hack_logo.png', '#00BCD4', 'Tech', 'arduinohackathon123'),
('Circuit Design (Group)', 'Circuit Design is a technical activity where participants create electronic circuits. Players design circuits using different electronic components. The activity tests technical knowledge and problem-solving skills.', 'tech', 'group', 60, 2, 'images/circuit_logo.png', '#00BCD4', 'Tech', 'circuitdesigngroup123'),
('Word Puzzle', 'Word Puzzle Round tests technical knowledge using puzzles like scrambled words and clues. Participants solve within a fixed time. Focuses on logical thinking and problem-solving. Winners based on accuracy and time.', 'tech', 'group', 50, 2, 'images/word_logo.png', '#00BCD4', 'Tech', 'wordpuzzle123'),
('5hr Hackathon', 'A 5-Hour Hackathon is a fast-paced coding event where participants build a project within five hours. Teams work on innovative ideas, software, or technical solutions. The event encourages creativity, teamwork, and problem-solving skills.', 'tech', 'group', 160, 4, 'images/hack_logo.png', '#00BCD4', 'Tech', '5hrhackathon123');

-- NON-TECHNICAL INDIVIDUAL EVENTS
INSERT INTO events (title, description, category, type, fee, max_members, logo_url, color, badge, password) VALUES
('Thunder Shock', 'A precision-based challenge where participants guide a ring along a wire without touching it. Any contact triggers an alarm and leads to elimination. It tests steady hands, focus, and control.', 'nontech', 'individual', 30, 1, 'images/thunder_logo.png', '#7B2FBE', 'Fun', 'thundershock123'),
('Ping Pong Toss', 'A carnival-style aim game! Throw ping pong balls to land them inside high-value glass targets across the table to accumulate the highest score.', 'nontech', 'individual', 30, 1, 'images/ping_logo.png', '#7B2FBE', 'Fun', 'pingpongtoss123');

-- NON-TECHNICAL GROUP EVENTS
INSERT INTO events (title, description, category, type, fee, max_members, logo_url, color, badge, password) VALUES
('Escape the Darkness', 'Escape the Darkness is a thrilling game designed with a scary and mysterious environment. Participants enter the den and face surprising horror elements and challenges. Players must stay calm and complete the task inside the den.', 'nontech', 'group', 160, 4, 'images/escape_logo.png', '#E91E8C', 'Fun', 'escapethedarkness123'),
('Triathlon', 'Triathlon is a dynamic team event combining three fun challenges—Lemon and Spoon, Balloon Blast, and Cup Pyramid. Teams of two must race, coordinate, and build under pressure across each stage. It tests balance, teamwork, and speed.', 'nontech', 'group', 60, 2, 'images/tri_logo.png', '#E91E8C', 'Fun', 'triathlon123'),
('Live Ludo', 'LIVE LUDO is a real-life version of the traditional Ludo board game. In this game, participants act as the tokens and move on a large Ludo board made on the ground.', 'nontech', 'group', 160, 4, 'images/ludo_logo.png', '#E91E8C', 'Fun', 'liveludo123'),
('Treasure Hunt', 'Treasure Hunt is a fun game where participants search for hidden clues. Each clue leads to the next location. Players must solve puzzles to reach the final treasure. The team that finds the treasure first wins.', 'nontech', 'group', 160, 4, 'images/hunt_logo.png', '#E91E8C', 'Fun', 'treasurehunt123'),
('Satoliya', 'Satoliya is a traditional outdoor game played with seven stacked stones and a ball. One team throws the ball to break the stack of stones. The same team must rebuild the stack while the other team tries to hit them with the ball.', 'nontech', 'group', 200, 5, 'images/satoliya_logo.png', '#E91E8C', 'Fun', 'satoliya123'),
('Tic Tac Toe', 'Tic Tac Toe is a simple strategy game played between two players. Players take turns marking X or O on a grid. The goal is to make a straight line of three marks horizontally, vertically, or diagonally.', 'nontech', 'group', 160, 4, 'images/tic_logo.png', '#E91E8C', 'Fun', 'tictactoe123'),
('Musical Dumb Charades', 'Musical Dhamseras is a fun team game of music and quick thinking. One player listens to a song, identifies its movie, and then explains the movie to their team without naming it.', 'nontech', 'group', 160, 4, 'images/dhamseras_logo.png', '#E91E8C', 'Fun', 'musicaldumbcharades123'),
('Blind Direction', 'Blind Direction is a fun teamwork game where one player is blindfolded. Other teammates give directions to guide the player toward the goal. The blindfolded player must follow the instructions carefully.', 'nontech', 'group', 60, 2, 'images/blind_logo.png', '#E91E8C', 'Fun', 'blinddirection123'),
('Dodge Ball', 'Dodge Ball is an exciting team game played with a ball. Players try to hit opponents with the ball while avoiding getting hit themselves. If a player is hit by the ball, they are out of the round.', 'nontech', 'group', 200, 5, 'images/dodge_logo.png', '#E91E8C', 'Fun', 'dodgeball123'),
('Dog & Bone', 'Dog & Bone is a fun team game played between two groups. A bone (object) is placed in the center between the teams. When a number is called, players with that number from each team run to grab the bone.', 'nontech', 'group', 200, 10, 'images/bone_logo.png', '#E91E8C', 'Fun', 'dogbone123'),
('Faculty Box Cricket', 'A 5-over, enclosed Box Cricket tournament meant specifically for faculty members to unwind and smash some boundaries.', 'nontech', 'group', 0, 5, 'images/cricket_logo.png', '#E91E8C', 'Fun', 'facultyboxcricket123');

-- GAMES
INSERT INTO events (title, description, category, type, fee, max_members, logo_url, color, badge, password) VALUES
('BGMI Tournament', 'Battlegrounds Mobile India (BGMI) is a popular multiplayer battle royale mobile game. Players land on an island, collect weapons, and fight against other players. The safe zone gradually shrinks, making the game more intense.', 'game', 'group', 160, 4, 'images/bgmi_logo.png', '#6C3483', 'Gaming', 'bgmitournament123'),
('Free Fire', 'Garena Free Fire is a popular multiplayer battle royale mobile game. Players land on an island and collect weapons, equipment, and resources to survive. The safe zone keeps shrinking, forcing players to fight and stay inside the zone.', 'game', 'group', 160, 4, 'images/ff_logo.png', '#27AE60', 'Gaming', 'freefire123'),
('Call of Duty', 'Call of Duty: Mobile is a popular multiplayer shooting game played on mobile devices. Players compete in different modes like team battles and survival matches. The game includes various weapons, maps, and strategies.', 'game', 'group', 160, 4, 'images/cod_logo.png', '#E74C3C', 'Gaming', 'callofduty123');
