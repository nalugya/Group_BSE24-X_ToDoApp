const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Todo = require('./models/Todo');

var app = express();

// CORS configuration to allow requests from your frontend URL
app.use(cors({
    origin: 'https://group-bse24-x-todoapp-2-frontend.onrender.com',  // Your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,  // Allow credentials (optional, remove if not needed)
}));

app.use(express.json());

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

// Set up the server to listen on the specified port
const PORT = process.env.PORT || 3001;  // Use PORT from environment variables or default to 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
