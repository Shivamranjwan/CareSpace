const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend
app.use('/', express.static(path.join(__dirname, 'CEP')));

// helper to read/write DB
function readDB(){
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}
function writeDB(db){
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// API routes
app.post('/api/user/register', (req, res) => {
  const { username, email, password, location } = req.body;
  if(!username || !email || !password) return res.status(400).json({error:'missing fields'});
  const db = readDB();
  const exists = db.users.find(u => u.email === email);
  if(exists) return res.status(400).json({error:'user exists'});
  const user = { id: Date.now(), username, email, password, location: location||'', role:'user' };
  db.users.push(user);
  writeDB(db);
  return res.json({ok:true, user});
});

app.post('/api/hospital/register', (req, res) => {
  const { name, email, password, beds, location } = req.body;
  if(!name || !email || !password) return res.status(400).json({error:'missing fields'});
  const db = readDB();
  const exists = db.hospitals.find(h => h.email === email);
  if(exists) return res.status(400).json({error:'hospital exists'});
  const hospital = { id: Date.now(), name, email, password, beds: Number(beds)||0, location: location||'', availableBeds: Number(beds)||0 };
  db.hospitals.push(hospital);
  writeDB(db);
  return res.json({ok:true, hospital});
});

app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  const db = readDB();
  if(role === 'hospital'){
    const h = db.hospitals.find(x => x.email === email && x.password === password);
    if(!h) return res.status(401).json({error:'invalid credentials'});
    return res.json({ok:true, user: h});
  } else {
    const u = db.users.find(x => x.email === email && x.password === password);
    if(!u) return res.status(401).json({error:'invalid credentials'});
    return res.json({ok:true, user: u});
  }
});

app.get('/api/hospitals', (req, res) => {
  const db = readDB();
  return res.json(db.hospitals);
});

app.post('/api/book', (req, res) => {
  const { userId, hospitalId } = req.body;
  if(!userId || !hospitalId) return res.status(400).json({error:'missing fields'});
  const db = readDB();
  const hosp = db.hospitals.find(h => String(h.id) === String(hospitalId));
  const user = db.users.find(u => String(u.id) === String(userId));
  if(!hosp) return res.status(404).json({error:'hospital not found'});
  if(!user) return res.status(404).json({error:'user not found'});
  if(hosp.availableBeds <= 0) return res.status(400).json({error:'no beds available'});
  hosp.availableBeds -= 1;
  const booking = { id: Date.now(), userId: user.id, hospitalId: hosp.id, createdAt: new Date().toISOString() };
  db.bookings.push(booking);
  writeDB(db);
  return res.json({ok:true, booking});
});

// fallback - serve index.html for SPA routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'CEP', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});