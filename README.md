# Winner Selection Application

A web application that allows admins to upload CSV files, parse and display the data, and randomly select winners while ensuring previously selected winners are not picked again.

## Features

- Admin authentication
- CSV file upload
- CSV data parsing and display
- Random winner selection
- Previous winner tracking
- Data summary statistics

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   ADMIN_USERNAME=SkylightAdmin
   ADMIN_PASSWORD=SkylightMediakart2025
   ```
4. Start the server:
   ```
   npm start
   ```
5. Access the application at `http://localhost:3000`

## Admin Login

Use the following credentials to log in:
- Username: SkylightAdmin
- Password: SkylightMediakart2025

## CSV Format

Your CSV file should have headers in the first row. The application will use these headers to display the data in a table and to identify unique winners.

## Winner Selection

When selecting winners, the application will:
1. Exclude any previously selected winners
2. Randomly select the requested number of winners
3. Store the winners in a JSON file for future reference

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- File Parsing: csv-parser
- File Upload: multer# Skylight
