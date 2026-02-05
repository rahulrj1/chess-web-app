const express = require('express');
const mongoose = require('mongoose');

const Document = require('./models/Document');
const User = require('./models/Users');

const app = express();
const http = require('http').createServer(app);
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_CONNECT);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
});

connectDB();


// root server for testing
app.get('/', (req, res) => {
    res.status(200).send("Server Running ...");
})

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND,
    credentials: true
}));
app.set('trust proxy', 1);

// Get User detail
app.post('/getuser', async (req, res) => {
    try {
        const token = req.body.jwtToken;

        if (!token) {
            return res.json({ user: null, msg: 'not-verified' });
        }

        const decodedToken = jwt.verify(token, process.env.TOKEN);
        const user = await User.findById(decodedToken.id).select('-playerPassword');
        
        if (!user) {
            return res.json({ user: null, msg: 'not-verified' });
        }

        res.json({ user, msg: 'verified' });
    } catch (error) {
        console.error('getuser error:', error.message);
        res.json({ user: null, msg: 'not-verified' });
    }
})

// Creating Token 
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
    return jwt.sign({ id }, process.env.TOKEN, {
        expiresIn: maxAge
    });
}

// Register user
app.post('/users/register', async (req, res) => {
    try {
        const { name, id, email, password } = req.body;

        // Input validation
        if (!name || !id || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check for existing users
        const emailExist = await User.findOne({ playerEmailId: email });
        if (emailExist) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const playerIdExist = await User.findOne({ playerId: id });
        if (playerIdExist) {
            return res.status(400).json({ message: 'User with this userid already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            playerName: name,
            playerId: id,
            playerEmailId: email,
            playerPassword: hashedPassword
        });

        await user.save();
        res.status(201).redirect(process.env.FRONTEND);
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
})


// Login user
app.post('/users/login', async (req, res) => {
    try {
        const { id, password } = req.body;

        // Input validation
        if (!id || !password) {
            return res.status(400).json({ msg: 'User ID and password are required' });
        }

        const user = await User.findOne({ playerId: id });
        if (!user) {
            return res.status(401).json({ msg: 'nologsuc' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.playerPassword);
        if (!validPassword) {
            return res.status(401).json({ msg: 'Password is incorrect' });
        }

        // Create token and set cookie
        const token = createToken(user._id);
        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: maxAge * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        // Return user without password
        const userResponse = {
            _id: user._id,
            playerName: user.playerName,
            playerId: user.playerId,
            playerEmailId: user.playerEmailId,
            playerRating: user.playerRating
        };

        res.json({ token, user: userResponse, msg: 'logsuc' });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ msg: 'Server error during login' });
    }
})

// Delete Chessboard
app.post('/deleteboard', async (req, res) => {
    try {
        const token = req.body.jwtToken;

        if (!token) {
            return res.status(400).json({ msg: 'Token required' });
        }

        const decodedToken = jwt.verify(token, process.env.TOKEN);
        const room = req.body.roomId;

        if (!room) {
            return res.status(400).json({ msg: 'Room ID required' });
        }

        const board = await Document.findById(room);
        
        if (!board) {
            return res.status(404).json({ msg: 'Board not found' });
        }
        
        await board.deleteOne();
        res.status(200).json({ msg: 'Board deleted' });
    } catch (error) {
        console.error('Delete board error:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ msg: 'Invalid token' });
        }
        res.status(500).json({ msg: 'Server error' });
    }
})

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    try {
        // Close HTTP server
        http.close(() => {
            console.log('HTTP server closed');
        });
        
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error.message);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Socket connection 
const io = require('socket.io')(http, {
    cors: {
        origin: [process.env.FRONTEND],
        methods: ["GET", "POST"]
    },
})

io.on('connection', socket => {
    socket.on('join', async (roomId, pieces) => {
        try {
            socket.join(roomId);

            const document = await findOrCreateDocument(roomId, pieces);
            if (!document) {
                socket.emit('error', 'Failed to load game');
                return;
            }
            
            socket.emit('load-chessboard', document.data, document.chance, document.black, document.white);

            // Size of room
            const room = io.sockets.adapter.rooms.get(roomId);
            const size = room ? room.size : 0;
       
        if (size === 1) {
            if (document.white === null) {
                socket.emit('player-color', "white")
            }
        }
        else if (size === 2) {
            if (document.black === null) {
                socket.emit('player-color', "black")
            }
        }

        if (size > 2) {
            socket.emit('room-full', roomId, true);
        }

        // Saving player color on reload 
        socket.on('save-my-color', async (p_email, p_color) => {
            try {
                const doc = await Document.findById(roomId);
                if (!doc) return;
                
                if (p_color === 'black' && doc.black === null) { doc.black = p_email; }
                if (p_color === 'white' && doc.white === null) { doc.white = p_email; }
                await doc.save();
            } catch (error) {
                console.error('save-my-color error:', error.message);
            }
        })

        // Sending movement Pieces to Other Player
        socket.on('send-pieces', (pieces, opponentColor) => {
            socket.to(roomId).emit('recieve-pieces', pieces, opponentColor)
        })

        // Saving Pieces on Chessboard 
        socket.on('save-chessboard', async (newData, newChance, playeremail) => {
            try {
                const doc = await Document.findById(roomId);
                if (!doc) return;
                
                doc.data = newData;
                doc.chance = newChance;
                if (newChance === 'white' && doc.black === null) { doc.black = playeremail; }
                if (newChance === 'black' && doc.white === null) { doc.white = playeremail; }
                await doc.save();
            } catch (error) {
                console.error('save-chessboard error:', error.message);
            }
        })

        socket.on('game-end-checkmate', async (loseColor) => {
            try {
                const doc = await Document.findById(roomId);
                if (!doc) {
                    console.error('game-end-checkmate: Document not found');
                    return;
                }

                const blackUserInfo = await User.findOne({ playerEmailId: doc.black });
                const whiteUserInfo = await User.findOne({ playerEmailId: doc.white });

                // Only update ratings if both users are found
                if (blackUserInfo && whiteUserInfo) {
                    const ratingChange = 10;
                    
                    if (loseColor === 'white') {
                        whiteUserInfo.playerRating -= ratingChange;
                        blackUserInfo.playerRating += ratingChange;
                    } else {
                        whiteUserInfo.playerRating += ratingChange;
                        blackUserInfo.playerRating -= ratingChange;
                    }
                    
                    await Promise.all([
                        whiteUserInfo.save(),
                        blackUserInfo.save()
                    ]);
                }

                await doc.deleteOne();
                socket.to(roomId).emit('receive-update-checkmate', loseColor);
            } catch (error) {
                console.error('game-end-checkmate error:', error.message);
            }
        })

        socket.on('game-end-stalemate', async () => {
            try {
                const doc = await Document.findById(roomId);
                if (doc) {
                    await doc.deleteOne();
                }
                socket.to(roomId).emit('receive-update-stalemate');
            } catch (error) {
                console.error('game-end-stalemate error:', error.message);
            }
        })

        socket.on('user-left', () => {
            socket.to(roomId).emit('opponent-left');
        })

        socket.on('send-opponent-info', (user) => {
            socket.to(roomId).emit('recieve-opponent-info', user);
        })
        
        } catch (error) {
            console.error('Socket join error:', error.message);
            socket.emit('error', 'Failed to join room');
        }
    })
})

async function findOrCreateDocument(id, pieces) {
    if (!id) return null;

    try {
        const document = await Document.findById(id);
        if (document) return document;
        
        return await Document.create({
            _id: id,
            data: pieces,
            chance: 'white',
            black: null,
            white: null
        });
    } catch (error) {
        console.error('findOrCreateDocument error:', error.message);
        return null;
    }
}