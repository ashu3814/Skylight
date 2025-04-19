require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure database directory exists
const databaseDir = path.join(__dirname, 'database');
if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

// Initialize winners file if it doesn't exist
const winnersFilePath = path.join(databaseDir, 'winners.json');
if (!fs.existsSync(winnersFilePath)) {
  fs.writeFileSync(winnersFilePath, JSON.stringify([], null, 2));
}

// Admin credentials from .env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'SkylightAdmin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SkylightMediakart2025';

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  const { username, password } = req.headers;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).send({ message: "Access denied!" });
  }
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.status(200).send({ message: "Login successful!" });
  } else {
    res.status(401).send({ message: "Unauthorized: Invalid credentials" });
  }
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, databaseDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'uploaded-data.csv'); // Always use the same filename to simplify
  }
});
const upload = multer({ storage });

// Upload endpoint
app.post('/api/upload', authenticateAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: "No file uploaded!" });
  }
  res.status(200).send({ message: "File uploaded successfully!" });
});

// Get CSV data endpoint
app.get('/api/csv-data', authenticateAdmin, (req, res) => {
  const filePath = path.join(databaseDir, 'uploaded-data.csv');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: "No CSV file found. Please upload a file first." });
  }

  const parsedData = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      parsedData.push(row);
    })
    .on('end', () => {
      res.status(200).send(parsedData);
    })
    .on('error', (error) => {
      res.status(500).send({ message: "Error parsing CSV file", error: error.message });
    });
});

// Random winner selection endpoint
app.post('/api/select-winners', authenticateAdmin, (req, res) => {
  const { numWinners } = req.body;
  const filePath = path.join(databaseDir, 'uploaded-data.csv');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: "No CSV file found. Please upload a file first." });
  }

  // Load previous winners
  let previousWinners = [];
  try {
    const winnersData = fs.readFileSync(winnersFilePath, 'utf8');
    previousWinners = JSON.parse(winnersData);
  } catch (error) {
    console.error("Error reading winners file:", error);
    previousWinners = [];
  }

  const data = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Check if this entry is already a winner
      const isAlreadyWinner = previousWinners.some(winner => {
        // Compare all properties of the objects
        return Object.keys(row).every(key => winner[key] === row[key]);
      });
      
      if (!isAlreadyWinner) {
        data.push(row);
      }
    })
    .on('end', () => {
      if (data.length < numWinners) {
        return res.status(400).send({ 
          message: `Not enough eligible participants. Requested ${numWinners} winners but only ${data.length} eligible participants remaining.` 
        });
      }

      const winners = [];
      const availableData = [...data]; // Create a copy to avoid modifying the original data

      while (winners.length < numWinners && availableData.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableData.length);
        winners.push(availableData.splice(randomIndex, 1)[0]);
      }

      // Update the winners file
      const updatedWinners = [...previousWinners, ...winners];
      fs.writeFileSync(winnersFilePath, JSON.stringify(updatedWinners, null, 2));

      res.status(200).send({ 
        winners, 
        totalWinners: updatedWinners.length,
        remainingEligible: data.length - winners.length
      });
    })
    .on('error', (error) => {
      res.status(500).send({ message: "Error processing the file", error: error.message });
    });
});

// Get previous winners endpoint
app.get('/api/previous-winners', authenticateAdmin, (req, res) => {
  try {
    if (!fs.existsSync(winnersFilePath)) {
      return res.status(200).send({ winners: [] });
    }

    const winnersData = fs.readFileSync(winnersFilePath, 'utf8');
    const winners = JSON.parse(winnersData);
    res.status(200).send({ winners });
  } catch (error) {
    res.status(500).send({ message: "Error fetching previous winners", error: error.message });
  }
});

// Summary statistics endpoint
app.get('/api/data-summary', authenticateAdmin, (req, res) => {
  const filePath = path.join(databaseDir, 'uploaded-data.csv');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: "No CSV file found. Please upload a file first." });
  }

  const columnSummary = {};
  let totalEntries = 0;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      totalEntries += 1;

      Object.keys(row).forEach((column) => {
        if (!columnSummary[column]) {
          columnSummary[column] = new Set();
        }
        columnSummary[column].add(row[column]);
      });
    })
    .on('end', () => {
      const summary = {};
      Object.keys(columnSummary).forEach((column) => {
        summary[column] = {
          uniqueValues: columnSummary[column].size,
        };
      });

      res.status(200).send({ totalEntries, summary });
    })
    .on('error', (error) => {
      res.status(500).send({ message: "Error processing the file", error: error.message });
    });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});