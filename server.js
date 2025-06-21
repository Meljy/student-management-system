require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000'
}));
app.use(express.json());

// Rate limiting (100 requests per 15 minutes)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studentDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Student Model
const Student = mongoose.model('Student', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 16, max: 99 },
  subjects: [String],
  grades: {
    activities: [{ subject: String, score: Number }],
    quizzes: [{ subject: String, score: Number }],
    exams: [{ subject: String, score: Number }]
  }
}));

// Routes
app.get('/', (req, res) => {
  res.send('🎉 Student Management Backend is Running!');
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single student
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new student
app.post('/api/students', async (req, res) => {
  const student = new Student({
    name: req.body.name,
    email: req.body.email,
    age: req.body.age,
    subjects: req.body.subjects || [],
    grades: {
      activities: req.body.grades?.activities || [],
      quizzes: req.body.grades?.quizzes || [],
      exams: req.body.grades?.exams || []
    }
  });

  try {
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: req.body.name,
          email: req.body.email,
          age: req.body.age,
          subjects: req.body.subjects,
          'grades.activities': req.body.grades?.activities,
          'grades.quizzes': req.body.grades?.quizzes,
          'grades.exams': req.body.grades?.exams
        }
      },
      { new: true }
    );
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    res.json(updatedStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});