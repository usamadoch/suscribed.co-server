import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patreon-mvp';

async function deleteTestUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        // Use raw collection access
        const db = mongoose.connection.db;
        if (db) {
            const result = await db.collection('users').deleteMany({
                email: { $in: ['creator@test.com', 'member@test.com'] }
            });
            console.log(`Deleted ${result.deletedCount} test users`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

deleteTestUsers();
