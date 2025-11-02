const mongoose = require('mongoose');
require("dotenv").config();

class Database {
  constructor() {
    this.connection = null; // Cached connection
  }

  async connect() {
    if (this.connection) {
      // Reuse existing connection (important for serverless)
      return this.connection;
    }

    try {
      const mongoUri =
        process.env.NODE_ENV === 'test'
          ? process.env.MONGODB_TEST_URI
          : process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MONGODB_URI not set');
      }

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      };

      this.connection = await mongoose.connect(mongoUri, options);

      console.log(`MongoDB Connected: ${this.connection.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error; // Don't exit, let Vercel handle
    }
  }

  async disconnect() {
    try {
      if (!this.connection) return;
      await mongoose.connection.close();
      this.connection = null;
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  getConnection() {
    return this.connection;
  }

  async isHealthy() {
    try {
      const state = mongoose.connection.readyState;
      return state === 1;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new Database();
