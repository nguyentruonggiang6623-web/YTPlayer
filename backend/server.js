const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

const dataDir = process.env.DATA_DIR || __dirname;
// Serve static files from downloads
app.use('/downloads', express.static(path.join(dataDir, 'downloads')));

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      console.log(`Server is running on port ${actualPort}`);
      resolve({ server, port: actualPort });
    }).on('error', reject);
  });
}

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  startServer(PORT);
}

module.exports = { startServer, app };
