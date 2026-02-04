import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import User from './models/User.js';
import CreatorPage from './models/CreatorPage.js';
import Post from './models/Post.js';
import Membership from './models/Membership.js';
import Comment from './models/Comment.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patreon-mvp';
const TEST_PASSWORD = 'TestPassword123!';

// Helper to generate random number in range
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to pick random items from array
const pickRandom = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// Sample content for posts
const sampleTitles = [
    'Behind the Scenes of My Latest Project',
    'Weekly Update: What I\'ve Been Working On',
    'Exclusive Preview: Upcoming Content',
    'Thank You for 1000 Members!',
    'My Creative Process Explained',
    'Tutorial: How I Create My Content',
    'Q&A Session Answers',
    'Monthly Recap & Goals',
    'Special Announcement',
    'Early Access: New Project',
    'Personal Story Time',
    'Tips and Tricks I\'ve Learned',
    'Collaboration Announcement',
    'Behind My Setup',
    'Exclusive Member Wallpapers',
    'Responding to Your Comments',
    'My Journey So Far',
    'What\'s Coming Next',
    'Milestone Celebration',
    'Sneak Peek of Tomorrow\'s Release',
    'Fan Art Showcase',
    'Community Spotlight',
    'Live Stream Announcement',
    'New Merch Drop',
    'Poll Results Discussion',
];

const sampleComments = [
    'This is amazing! Keep up the great work! 🎉',
    'Love your content! Been a fan for years.',
    'So inspiring! Thank you for sharing.',
    'Can\'t wait to see more!',
    'This made my day!',
    'You\'re the best creator on this platform!',
    'Been waiting for this! 🙌',
    'Your content always delivers!',
    'Take my money! 💰',
    'First! Love your work!',
    'This is why I subscribe!',
    'Quality content as always.',
    'You inspire me to create too!',
    'The best thing I\'ve seen today!',
    'Please do more of these!',
    'Absolutely incredible!',
    'Worth every penny of my subscription!',
    'Your tutorials are the best!',
    'Sharing this with everyone!',
    'This deserves more attention!',
];

// Creator profiles
const creatorProfiles = [
    {
        username: 'megastar',
        displayName: 'MegaStar Entertainment',
        email: 'megastar@test.com',
        tagline: '🌟 The #1 Creator on the Platform! 10M+ Views!',
        about: '<p>Welcome to the biggest creator page on the platform!</p><p>Daily uploads, exclusive content, and a community of over 50,000 members!</p><p>Join the family and get access to:</p><ul><li>Behind-the-scenes content</li><li>Early access to all videos</li><li>Monthly Q&A sessions</li><li>Exclusive merchandise discounts</li></ul>',
        isFamous: true,
        postCount: 25,
        memberCount: 50000,
    },
    {
        username: 'artmaster',
        displayName: 'Art Master Studios',
        email: 'artmaster@test.com',
        tagline: '🎨 Digital Art & Illustration Tutorials',
        about: '<p>Professional digital artist with 10+ years experience.</p><p>Weekly tutorials, process videos, and downloadable resources.</p>',
        isFamous: false,
        postCount: 12,
        memberCount: 5000,
    },
    {
        username: 'techguru',
        displayName: 'Tech Guru',
        email: 'techguru@test.com',
        tagline: '💻 Software Development & Tech Reviews',
        about: '<p>Senior software engineer sharing knowledge.</p><p>Code tutorials, tech reviews, and career advice.</p>',
        isFamous: false,
        postCount: 15,
        memberCount: 8000,
    },
    {
        username: 'fitnesschamp',
        displayName: 'Fitness Champion',
        email: 'fitnesschamp@test.com',
        tagline: '💪 Transform Your Body, Transform Your Life',
        about: '<p>Certified personal trainer and nutritionist.</p><p>Workout plans, meal preps, and motivation!</p>',
        isFamous: false,
        postCount: 18,
        memberCount: 12000,
    },
    {
        username: 'musicmaker',
        displayName: 'Music Maker Pro',
        email: 'musicmaker@test.com',
        tagline: '🎵 Music Production & Beats',
        about: '<p>Professional music producer.</p><p>Tutorials, sample packs, and behind-the-scenes of hit songs.</p>',
        isFamous: false,
        postCount: 10,
        memberCount: 3500,
    },
    {
        username: 'gaminglegend',
        displayName: 'Gaming Legend',
        email: 'gaminglegend@test.com',
        tagline: '🎮 Pro Gamer | Streamer | Content Creator',
        about: '<p>Professional esports player turned content creator.</p><p>Game guides, strategies, and exclusive streams.</p>',
        isFamous: false,
        postCount: 20,
        memberCount: 15000,
    },
    {
        username: 'cookinmama',
        displayName: 'Cooking with Mama',
        email: 'cookinmama@test.com',
        tagline: '🍳 Home Cooking Made Easy',
        about: '<p>30 years of cooking experience in your pocket!</p><p>Family recipes, cooking tips, and meal planning.</p>',
        isFamous: false,
        postCount: 8,
        memberCount: 2500,
    },
];

// Member names
const memberNames = [
    { username: 'johndoe', displayName: 'John Doe', email: 'john@test.com' },
    { username: 'janesmith', displayName: 'Jane Smith', email: 'jane@test.com' },
    { username: 'mikebrown', displayName: 'Mike Brown', email: 'mike@test.com' },
    { username: 'sarahlee', displayName: 'Sarah Lee', email: 'sarah@test.com' },
    { username: 'chriswilson', displayName: 'Chris Wilson', email: 'chris@test.com' },
    { username: 'emilyjones', displayName: 'Emily Jones', email: 'emily@test.com' },
    { username: 'davidmiller', displayName: 'David Miller', email: 'david@test.com' },
    { username: 'lisagarcia', displayName: 'Lisa Garcia', email: 'lisa@test.com' },
    { username: 'jamesmartin', displayName: 'James Martin', email: 'james@test.com' },
    { username: 'amandataylor', displayName: 'Amanda Taylor', email: 'amanda@test.com' },
    { username: 'robertanderson', displayName: 'Robert Anderson', email: 'robert@test.com' },
    { username: 'ashleythomas', displayName: 'Ashley Thomas', email: 'ashley@test.com' },
    { username: 'danieljackson', displayName: 'Daniel Jackson', email: 'daniel@test.com' },
    { username: 'jessicawhite', displayName: 'Jessica White', email: 'jessica@test.com' },
    { username: 'matthewharris', displayName: 'Matthew Harris', email: 'matthew@test.com' },
];

const seedData = async () => {
    try {
        console.log('🌱 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // ============================================
        // CLEAR EXISTING TEST DATA
        // ============================================
        console.log('🧹 Clearing existing test data...');

        const testEmails = [
            ...creatorProfiles.map(c => c.email),
            ...memberNames.map(m => m.email),
            'creator@test.com',
            'member@test.com',
            'admin@test.com',
        ];

        await User.deleteMany({ email: { $in: testEmails } });
        await CreatorPage.deleteMany({ pageSlug: { $in: [...creatorProfiles.map(c => c.username), 'testcreator'] } });
        await Post.deleteMany({}); // Clear all posts for clean slate
        await Membership.deleteMany({});
        await Comment.deleteMany({});

        console.log('✅ Cleared existing data\n');

        const createdCreators: any[] = [];
        const createdPages: any[] = [];
        const createdPosts: any[] = [];
        const createdMembers: any[] = [];

        // ============================================
        // CREATE CREATORS
        // ============================================
        console.log('👤 Creating creators...');

        for (const profile of creatorProfiles) {
            const creator = await User.create({
                email: profile.email,
                username: profile.username,
                passwordHash: TEST_PASSWORD,
                displayName: profile.displayName,
                role: 'creator',
                isEmailVerified: true,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
            });
            createdCreators.push(creator);

            const page = await CreatorPage.create({
                userId: creator._id,
                pageSlug: profile.username,
                displayName: profile.displayName,
                tagline: profile.tagline,
                about: profile.about,
                isPublic: true,
                bannerUrl: `https://picsum.photos/seed/${profile.username}/1500/500`,
                theme: {
                    primaryColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
                    accentColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
                    layout: 'default',
                },
                socialLinks: [
                    { platform: 'twitter', url: `https://twitter.com/${profile.username}` },
                    { platform: 'youtube', url: `https://youtube.com/${profile.username}` },
                    { platform: 'instagram', url: `https://instagram.com/${profile.username}` },
                ],
                memberCount: profile.memberCount,
                postCount: profile.postCount,
            });
            createdPages.push(page);

            console.log(`   ✅ Created ${profile.displayName} (${profile.isFamous ? '⭐ FAMOUS' : 'regular'})`);
        }

        // ============================================
        // CREATE POSTS FOR EACH CREATOR
        // ============================================
        console.log('\n📝 Creating posts...');

        for (let i = 0; i < createdCreators.length; i++) {
            const creator = createdCreators[i];
            const page = createdPages[i];
            const profile = creatorProfiles[i];

            const shuffledTitles = [...sampleTitles].sort(() => 0.5 - Math.random());

            for (let j = 0; j < profile.postCount; j++) {
                const isPublic = Math.random() > 0.3; // 70% public
                const daysAgo = rand(1, 365);
                const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

                // Famous creator gets more engagement
                const likeMultiplier = profile.isFamous ? 100 : rand(5, 20);
                const viewMultiplier = profile.isFamous ? 500 : rand(10, 50);

                const post = await Post.create({
                    creatorId: creator._id,
                    pageId: page._id,
                    caption: `This is post #${j + 1} from ${profile.displayName}. ${shuffledTitles[j % shuffledTitles.length]}`,
                    visibility: isPublic ? 'public' : 'members',
                    status: 'published',
                    // featuredImage removed
                    viewCount: rand(100, 1000) * viewMultiplier,
                    likeCount: rand(10, 100) * likeMultiplier,
                    commentCount: profile.isFamous ? rand(50, 500) : rand(5, 50),
                    createdAt,
                    updatedAt: createdAt,
                });
                createdPosts.push({ post, creatorIndex: i });
            }
            console.log(`   ✅ Created ${profile.postCount} posts for ${profile.displayName}`);
        }

        // ============================================
        // CREATE MEMBERS
        // ============================================
        console.log('\n👥 Creating members...');

        for (const memberData of memberNames) {
            const member = await User.create({
                email: memberData.email,
                username: memberData.username,
                passwordHash: TEST_PASSWORD,
                displayName: memberData.displayName,
                role: 'member',
                isEmailVerified: true,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberData.username}`,
            });
            createdMembers.push(member);
        }
        console.log(`   ✅ Created ${createdMembers.length} members`);

        // ============================================
        // CREATE MEMBERSHIPS (Members following Creators)
        // ============================================
        console.log('\n🔗 Creating memberships...');

        let membershipCount = 0;

        for (const member of createdMembers) {
            // Each member follows 2-5 random creators
            const creatorsToFollow = pickRandom(createdCreators, rand(2, 5));

            for (const creator of creatorsToFollow) {
                const creatorPage = createdPages.find(p => p.userId.toString() === creator._id.toString());
                if (creatorPage) {
                    const daysAgo = rand(1, 180);
                    await Membership.create({
                        memberId: member._id,
                        creatorId: creator._id,
                        pageId: creatorPage._id,
                        status: 'active',
                        joinedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
                    });
                    membershipCount++;
                }
            }
        }

        // Famous creator gets all members following
        const famousCreator = createdCreators[0];
        const famousPage = createdPages[0];
        for (const member of createdMembers) {
            const existingMembership = await Membership.findOne({ memberId: member._id, creatorId: famousCreator._id });
            if (!existingMembership) {
                await Membership.create({
                    memberId: member._id,
                    creatorId: famousCreator._id,
                    pageId: famousPage._id,
                    status: 'active',
                    joinedAt: new Date(Date.now() - rand(1, 365) * 24 * 60 * 60 * 1000),
                });
                membershipCount++;
            }
        }

        console.log(`   ✅ Created ${membershipCount} memberships`);

        // ============================================
        // CREATE COMMENTS
        // ============================================
        console.log('\n💬 Creating comments...');

        let commentCount = 0;

        for (const { post, creatorIndex } of createdPosts) {
            const profile = creatorProfiles[creatorIndex];
            const numComments = profile.isFamous ? rand(10, 30) : rand(2, 10);

            const commenters = pickRandom(createdMembers, Math.min(numComments, createdMembers.length));

            for (let i = 0; i < commenters.length; i++) {
                const commenter = commenters[i];
                const daysAgo = rand(0, 30);

                await Comment.create({
                    postId: post._id,
                    authorId: commenter._id,
                    content: sampleComments[rand(0, sampleComments.length - 1)],
                    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
                });
                commentCount++;
            }
        }

        console.log(`   ✅ Created ${commentCount} comments`);

        // ============================================
        // ALSO CREATE THE SIMPLE TEST ACCOUNTS
        // ============================================
        console.log('\n🔑 Creating simple test accounts...');

        const simpleCreator = await User.create({
            email: 'creator@test.com',
            username: 'testcreator',
            passwordHash: TEST_PASSWORD,
            displayName: 'Test Creator',
            role: 'creator',
            isEmailVerified: true,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=testcreator',
        });

        await CreatorPage.create({
            userId: simpleCreator._id,
            pageSlug: 'testcreator',
            displayName: 'Test Creator',
            tagline: 'Simple test creator account',
            about: '<p>This is a simple test creator account.</p>',
            isPublic: true,
            memberCount: 0,
            postCount: 0,
        });

        await User.create({
            email: 'member@test.com',
            username: 'testmember',
            passwordHash: TEST_PASSWORD,
            displayName: 'Test Member',
            role: 'member',
            isEmailVerified: true,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=testmember',
        });

        // Create admin user
        await User.create({
            email: 'admin@test.com',
            username: 'admin',
            passwordHash: TEST_PASSWORD,
            displayName: 'Admin User',
            role: 'admin',
            isEmailVerified: true,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        });

        console.log('   ✅ Created creator@test.com, member@test.com, and admin@test.com');

        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n' + '='.repeat(70));
        console.log('🎉 COMPREHENSIVE SEED DATA COMPLETE!');
        console.log('='.repeat(70));

        console.log('\n📊 DATA CREATED:');
        console.log('─'.repeat(70));
        console.log(`   👤 Creators:    ${createdCreators.length + 1} (including 1 FAMOUS creator)`);
        console.log(`   📝 Posts:       ${createdPosts.length}`);
        console.log(`   👥 Members:     ${createdMembers.length + 1}`);
        console.log(`   🔗 Memberships: ${membershipCount}`);
        console.log(`   💬 Comments:    ${commentCount}`);

        console.log('\n📋 TEST ACCOUNTS (all use same password):');
        console.log('─'.repeat(70));
        console.log(`   Password: ${TEST_PASSWORD}`);
        console.log('');
        console.log('   🎨 CREATORS:');
        console.log('      creator@test.com      (simple test account)');
        for (const profile of creatorProfiles) {
            const isFamous = profile.isFamous ? ' ⭐ FAMOUS' : '';
            console.log(`      ${profile.email.padEnd(25)} → /${profile.username}${isFamous}`);
        }
        console.log('');
        console.log('   👤 MEMBERS:');
        console.log('      member@test.com       (simple test account)');
        for (const member of memberNames.slice(0, 5)) {
            console.log(`      ${member.email}`);
        }
        console.log(`      ... and ${memberNames.length - 5} more`);

        console.log('\n─'.repeat(70));
        console.log('✨ You can now login with any of these accounts!');
        console.log('   Visit: http://localhost:3000/login');
        console.log('   Famous creator page: http://localhost:3000/megastar');
        console.log('');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
};

seedData();
