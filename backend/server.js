const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Todo = require('./models/Todo');
const client = require('prom-client');  // Import prom-client

var app = express();

// CORS configuration to allow requests from your frontend URL
app.use(cors({
    origin: 'https://group-bse24-x-todoapp-2-frontend.onrender.com',  // Your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,  // Allow credentials (optional, remove if not needed)
}));

app.use(express.json());

// Collect default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });  // Collect every 5 seconds

// Define custom metrics
const httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5]  // Buckets for response time from 100ms to 5s
});

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestErrorsTotal = new client.Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'status_code']
});

const dbQueryDurationSeconds = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]  // Buckets for query time from 10ms to 5s
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

        if (statusCode >= 400 && statusCode < 600) {
            httpRequestErrorsTotal.labels(method, route, statusCode).inc();
        }
    });

    next();
});

// Instrument MongoDB operations
const instrumentDBOperation = (operationName, operationFunc) => {
    return async (...args) => {
        const end = dbQueryDurationSeconds.startTimer({ operation: operationName });
        try {
            const result = await operationFunc(...args);
            end();
            return result;
        } catch (error) {
            end();
            throw error;
        }
    };
};

Todo.find = instrumentDBOperation('find', Todo.find.bind(Todo));
Todo.create = instrumentDBOperation('create', Todo.create.bind(Todo));
Todo.findByIdAndUpdate = instrumentDBOperation('findByIdAndUpdate', Todo.findByIdAndUpdate.bind(Todo));
Todo.findByIdAndDelete = instrumentDBOperation('findByIdAndDelete', Todo.findByIdAndDelete.bind(Todo));

// Connect to your MongoDB database with SSL enabled
mongoose.connect("mongodb+srv://admin:0754092850@todoapp.aqby3.mongodb.net/TODOAPP?retryWrites=true&w=majority&ssl=true");

// Check for database connection errors
mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
});

// Get saved tasks from the database
app.get("/getTodoList", (req, res) => {
    Todo.find({})
        .then((todoList) => res.json(todoList))
        .catch((err) => res.json(err));
});

// Add new task to the database
app.post("/addTodoList", (req, res) => {
    Todo.create({
        task: req.body.task,
        status: req.body.status,
        deadline: req.body.deadline,
    })
        .then((todo) => res.json(todo))
        .catch((err) => res.json(err));
});

// Update task fields (including deadline)
app.post("/updateTodoList/:id", (req, res) => {
    const id = req.params.id;
    const updateData = {
        task: req.body.task,
        status: req.body.status,
        deadline: req.body.deadline,
    };
    Todo.findByIdAndUpdate(id, updateData)
        .then((todo) => res.json(todo))
        .catch((err) => res.json(err));
});

// Delete task from the database
app.delete("/deleteTodoList/:id", (req, res) => {
    const id = req.params.id;
    Todo.findByIdAndDelete({ _id: id })
        .then((todo) => res.json(todo))
        .catch((err) => res.json(err));
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

// Set up the server to listen on the specified port
const PORT = process.env.PORT || 3001;  // Use PORT from environment variables or default to 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
