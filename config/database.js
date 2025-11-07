// config/database.js
const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
    this.connecting = false;
  }

  async connect(retries = 5, delay = 3000) {
    if (this.connection) return this.connection;
    if (this.connecting) {
      // Wait until current connection attempt finishes
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.connection) {
            clearInterval(checkInterval);
            resolve(this.connection);
          }
        }, 500);
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Connection wait timeout'));
        }, 20000);
      });
    }

    this.connecting = true;

    const mongoUri =
      process.env.NODE_ENV === 'test'
        ? process.env.MONGODB_TEST_URI
        : process.env.MONGODB_URI;

    if (!mongoUri) throw new Error('MONGODB_URI not set');

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.connection = await mongoose.connect(mongoUri, options);
        console.log(`MongoDB Connected: ${this.connection.connection.host}`);
        this.connecting = false;

        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('MongoDB disconnected. Reconnecting...');
          this.connection = null;
          this.connect();
        });

        return this.connection;
      } catch (error) {
        console.warn(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          console.error('Database connection failed after retries');
          this.connecting = false;
          throw error;
        }
      }
    }
  }

  async isHealthy() {
    try {
      return mongoose.connection.readyState === 1;
    } catch {
      return false;
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
}

module.exports = new Database();
