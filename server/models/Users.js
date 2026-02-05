const { Schema, model } = require('mongoose');
const { isEmail } = require('validator');

const UserSchema = new Schema({
    playerName: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    playerId: {
        type: String,
        unique: true,
        required: [true, 'Please enter a unique player ID'],
        trim: true,
        lowercase: true,
        index: true
    },
    playerEmailId: {
        type: String,
        required: [true, 'Please enter an email'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [isEmail, 'Please enter a valid email'],
        index: true
    },
    playerPassword: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    playerRating: {
        type: Number,
        default: 1200,
        min: [0, 'Rating cannot be negative']
    }
}, {
    timestamps: true
});

// Compound index for common queries
UserSchema.index({ playerEmailId: 1, playerId: 1 });

module.exports = model('User', UserSchema);