import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ email: 'admin@alumni.com' });
    if (existing) {
      console.log('✅ Admin already exists. Email: admin@alumni.com | Password: Admin@123');
      await mongoose.disconnect();
      return;
    }

    // Create admin
    await User.create({
      name: 'System Admin',
      email: 'admin@alumni.com',
      password: 'Admin@123',
      role: 'admin',
      isApproved: true
    });
    console.log('✅ Admin seeded successfully!');
    console.log('   Email: admin@alumni.com');
    console.log('   Password: Admin@123');

    // Sample approved alumni
    await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@alumni.com',
      password: 'Alumni@123',
      role: 'alumni',
      isApproved: true,
      branch: 'Computer Science',
      passOutYear: 2021,
      company: 'Google',
      jobRole: 'Software Engineer',
      experience: 3,
      bio: 'Passionate about building scalable systems. Love mentoring juniors.',
      skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'AWS'],
      interests: ['Web Dev', 'Cloud', 'Open Source'],
      links: { linkedin: 'https://linkedin.com', github: 'https://github.com' }
    });

    await User.create({
      name: 'Priya Nair',
      email: 'priya@alumni.com',
      password: 'Alumni@123',
      role: 'alumni',
      isApproved: true,
      branch: 'Electronics',
      passOutYear: 2020,
      company: 'Microsoft',
      jobRole: 'Product Manager',
      experience: 4,
      bio: 'Product thinker & tech enthusiast. Happy to help with career decisions.',
      skills: ['Product Management', 'Agile', 'Python', 'Data Analysis'],
      interests: ['AI/ML', 'Product', 'Startups'],
      links: { linkedin: 'https://linkedin.com', github: 'https://github.com' }
    });

    // Sample pending alumni
    await User.create({
      name: 'Karan Mehta',
      email: 'karan@alumni.com',
      password: 'Alumni@123',
      role: 'alumni',
      isApproved: false,
      branch: 'Mechanical',
      passOutYear: 2022,
      company: 'Tesla',
      jobRole: 'R&D Engineer',
      experience: 2,
      bio: 'Engineering meets innovation.',
      skills: ['CAD', 'Simulation', 'C++'],
      interests: ['Robotics', 'EV', 'Manufacturing']
    });

    // Sample student
    await User.create({
      name: 'Aisha Khan',
      email: 'student@alumni.com',
      password: 'Student@123',
      role: 'student',
      branch: 'Computer Science',
      year: '3rd Year',
      cgpa: 8.5,
      bio: 'Aspiring full-stack developer. Building cool things.',
      skills: ['HTML', 'CSS', 'JavaScript', 'React'],
      interests: ['Web Dev', 'UI/UX'],
      projects: [
        { title: 'Portfolio Website', description: 'Personal portfolio built with React.' },
        { title: 'Chat App', description: 'Real-time chat using Socket.IO.' }
      ],
      links: { linkedin: 'https://linkedin.com', github: 'https://github.com' }
    });

    console.log('✅ Sample data seeded!');
    console.log('   Student: student@alumni.com | Student@123');
    console.log('   Alumni (approved): rahul@alumni.com | Alumni@123');
    console.log('   Alumni (approved): priya@alumni.com | Alumni@123');
    console.log('   Alumni (pending): karan@alumni.com | Alumni@123');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seed();
