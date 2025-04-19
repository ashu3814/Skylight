let isAuthenticated = false;
let csvData = [];
let csvColumns = [];

// Cache DOM elements
const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');
const dataTable = document.getElementById('data-table');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const dataSummary = document.getElementById('data-summary');

// Helper function to show notifications
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = type;
  notification.textContent = message;
  
  // Find the relevant section to append the notification
  let targetSection;
  if (!isAuthenticated) {
    targetSection = loginSection;
  } else if (event && event.target && event.target.closest('form')) {
    targetSection = event.target.closest('form').parentElement;
  } else {
    targetSection = document.querySelector('.dashboard-panel');
  }
  
  targetSection.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => notification.remove(), 5000);
}

// Login functionality
document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      isAuthenticated = true;
      // Store credentials in session storage for API calls
      sessionStorage.setItem('username', username);
      sessionStorage.setItem('password', password);
      
      // Show dashboard and hide login
      loginSection.style.display = 'none';
      dashboard.style.display = 'block';
      
      // Load data if a CSV file already exists
      loadCsvData();
      showNotification('Login successful!');
    } else {
      showNotification(data.message || 'Login failed!', 'error');
    }
  } catch (error) {
    showNotification('Network error. Please try again.', 'error');
    console.error('Login error:', error);
  }
});

// File upload functionality
document.getElementById('upload-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const fileInput = document.getElementById('csvFile');
  if (!fileInput.files.length) {
    showNotification('Please select a CSV file first.', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'username': sessionStorage.getItem('username'),
        'password': sessionStorage.getItem('password'),
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (response.ok) {
      fileInput.value = ''; // Clear the file input
      showNotification(data.message);
      // Reload CSV data
      loadCsvData();
    } else {
      showNotification(data.message || 'Upload failed!', 'error');
    }
  } catch (error) {
    showNotification('Network error. Please try again.', 'error');
    console.error('Upload error:', error);
  }
});

// Load CSV data function
async function loadCsvData() {
  try {
    const response = await fetch('/api/csv-data', {
      method: 'GET',
      headers: {
        'username': sessionStorage.getItem('username'),
        'password': sessionStorage.getItem('password'),
      },
    });
    
    // If no CSV file exists yet, just return without error
    if (response.status === 404) {
      dataSummary.textContent = 'No CSV file uploaded yet. Please upload a file first.';
      tableHeader.innerHTML = '';
      tableBody.innerHTML = '';
      return;
    }
    
    if (!response.ok) {
      const data = await response.json();
      showNotification(data.message || 'Failed to load CSV data!', 'error');
      return;
    }
    
    csvData = await response.json();
    
    if (csvData.length > 0) {
      // Get columns from the first row
      csvColumns = Object.keys(csvData[0]);
      
      // Display table
      displayDataTable();
      
      // Load data summary
      loadDataSummary();
    } else {
      dataSummary.textContent = 'The uploaded CSV file is empty.';
      tableHeader.innerHTML = '';
      tableBody.innerHTML = '';
    }
  } catch (error) {
    showNotification('Error loading CSV data.', 'error');
    console.error('CSV data error:', error);
  }
}

// Display CSV data as a table
function displayDataTable() {
  // Clear existing table content
  tableHeader.innerHTML = '';
  tableBody.innerHTML = '';
  
  // Create table header
  const headerRow = document.createElement('tr');
  csvColumns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  tableHeader.appendChild(headerRow);
  
  // Create table body (limit to first 50 rows for performance)
  const displayData = csvData.slice(0, 50);
  displayData.forEach(row => {
    const tr = document.createElement('tr');
    csvColumns.forEach(column => {
      const td = document.createElement('td');
      td.textContent = row[column];
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
  
  // Show a message if data is truncated
  if (csvData.length > 50) {
    const infoRow = document.createElement('tr');
    const infoCell = document.createElement('td');
    infoCell.colSpan = csvColumns.length;
    infoCell.textContent = `Displaying 50 out of ${csvData.length} total entries`;
    infoCell.style.textAlign = 'center';
    infoCell.style.fontStyle = 'italic';
    infoRow.appendChild(infoCell);
    tableBody.appendChild(infoRow);
  }
}

// Load data summary
async function loadDataSummary() {
  try {
    const response = await fetch('/api/data-summary', {
      method: 'GET',
      headers: {
        'username': sessionStorage.getItem('username'),
        'password': sessionStorage.getItem('password'),
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      dataSummary.textContent = data.message || 'Failed to load data summary.';
      return;
    }
    
    const data = await response.json();
    
    dataSummary.innerHTML = `
      Total Entries: ${data.totalEntries}
      Columns: ${Object.keys(data.summary).length}
      Column Details:
      
        ${Object.entries(data.summary).map(([column, info]) => 
          `${column}: ${info.uniqueValues} unique values`
        ).join('')}
      
    `;
  } catch (error) {
    dataSummary.textContent = 'Error loading data summary.';
    console.error('Summary error:', error);
  }
}

// Winner selection functionality
document.getElementById('winner-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const numWinners = parseInt(document.getElementById('numWinners').value, 10);
  
  if (numWinners <= 0) {
    showNotification('Please enter a valid number of winners to select.', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/select-winners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'username': sessionStorage.getItem('username'),
        'password': sessionStorage.getItem('password'),
      },
      body: JSON.stringify({ numWinners }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      displayWinners(data.winners);
      showNotification(`Successfully selected ${data.winners.length} winners! ${data.remainingEligible} eligible participants remain.`);
    } else {
      showNotification(data.message || 'Failed to select winners.', 'error');
    }
  } catch (error) {
    showNotification('Network error. Please try again.', 'error');
    console.error('Winner selection error:', error);
  }
});

// Display selected winners
function displayWinners(winners) {
  const winnerList = document.getElementById('winner-list');
  winnerList.innerHTML = '';
  
  if (winners.length === 0) {
    winnerList.textContent = 'No winners selected.';
    return;
  }
  
  winners.forEach((winner, index) => {
    const winnerCard = document.createElement('div');
    winnerCard.className = 'winner-card';
    
    const winnerHeader = document.createElement('h4');
    winnerHeader.textContent = `Winner #${index + 1}`;
    winnerCard.appendChild(winnerHeader);
    
    const winnerDetails = document.createElement('div');
    Object.entries(winner).forEach(([key, value]) => {
      winnerDetails.innerHTML += `${key}: ${value}`;
    });
    
    winnerCard.appendChild(winnerDetails);
    winnerList.appendChild(winnerCard);
  });
}

// Load previous winners functionality
document.getElementById('load-previous-winners').addEventListener('click', async () => {
  const previousWinnersList = document.getElementById('previous-winners-list');
  previousWinnersList.innerHTML = 'Loading previous winners...';
  
  try {
    const response = await fetch('/api/previous-winners', {
      method: 'GET',
      headers: {
        'username': sessionStorage.getItem('username'),
        'password': sessionStorage.getItem('password'),
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      displayPreviousWinners(data.winners);
    } else {
      previousWinnersList.innerHTML = `${data.message || 'Failed to load previous winners.'}`;
    }
  } catch (error) {
    previousWinnersList.innerHTML = 'Network error. Please try again.';
    console.error('Previous winners error:', error);
  }
});

// Display previous winners
function displayPreviousWinners(winners) {
  const previousWinnersList = document.getElementById('previous-winners-list');
  previousWinnersList.innerHTML = '';
  
  if (winners.length === 0) {
    previousWinnersList.textContent = 'No previous winners found.';
    return;
  }
  
  const totalWinners = document.createElement('p');
  totalWinners.textContent = `Total previous winners: ${winners.length}`;
  previousWinnersList.appendChild(totalWinners);
  
  winners.forEach((winner, index) => {
    const winnerCard = document.createElement('div');
    winnerCard.className = 'winner-card';
    
    const winnerHeader = document.createElement('h4');
    winnerHeader.textContent = `Winner #${index + 1}`;
    winnerCard.appendChild(winnerHeader);
    
    const winnerDetails = document.createElement('div');
    Object.entries(winner).forEach(([key, value]) => {
      winnerDetails.innerHTML += `${key}: ${value}`;
    });
    
    winnerCard.appendChild(winnerDetails);
    previousWinnersList.appendChild(winnerCard);
  });
}