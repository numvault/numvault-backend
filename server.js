const cors = require('cors');

app.use(cors({
  origin: [
    'https://adorable-custard-f4f939.netlify.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Preflight requests handle করার জন্য
app.options('*', cors());
