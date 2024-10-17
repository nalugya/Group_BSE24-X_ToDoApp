const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Todo = require('./models/Todo');
const client = require('prom-client');  // Import prom-client

var app = express();

// CORS configuration to allow requests from your frontend URL
app.use(cors({
    origin: 'https://group-bse24-x-todoapp-2-frontend.onrender.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());

// Collect default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });  // Collect every 5 seconds

// Define custom backend metrics
const httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

// Define frontend metrics using Prometheus Gauge
const frontendMetric = new client.Gauge({
    name: 'frontend_metric',
    help: 'Frontend performance metric from web-vitals',
    labelNames: ['metric_name']
});

// Middleware to track HTTP requests
app.use((req, res, next) => {
    const startEpoch = Date.now();

    res.on('finish', () => {
        const responseTimeInSeconds = (Date.now() - startEpoch) / 1000;
        const method = req.method;
        const route = req.route ? req.route.path : req.path;
        const statusCode = res.statusCode;

        httpRequestTotal.labels(method, route, statusCode).inc();
        httpRequestDurationSeconds.labels(method, route, statusCode).observe(responseTimeInSeconds);
    });

    next();
});

// Route to receive frontend metrics
app.post('/metrics/frontend', (req, res) => {
    const { name, value } = req.body;  // Expecting metric name and value

    if (name && typeof value === 'number') {
        frontendMetric.set({ metric_name: name }, value);  // Store metric value
        res.status(200).json({ message: 'Metric recorded successfully' });
    } else {
        res.status(400).json({ error: 'Invalid metric data' });
    }
});

// Expose the /metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// Connect to your MongoDB database with SSL enabled
mongoose.connect("mongodb+srv://admin:0754092850@todoapp.aqby3.mongodb.net/TODOAPP?retryWrites=true&w=majority&ssl=true");

mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
});

// Set up the server to listen on the specified port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
