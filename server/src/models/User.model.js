/**
 * User Model
 * Represents a chess player in the system
 */

const { Schema, model } = require('mongoose');
const { isEmail } = require('validator');
const { RATING } = require('../utils/constants');

const userSchema = new Schema({
    playerName: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    playerId: {
        type: String,
        unique: true,
        required: [true, 'Please enter a unique player ID'],
        trim: true,
        lowercase: true,
        index: true,
    },
    playerEmailId: {
        type: String,
        required: [true, 'Please enter an email'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [isEmail, 'Please enter a valid email'],
        index: true,
    },
    playerPassword: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false, // Don't include password by default in queries
    },
    playerRating: {
        type: Number,
        default: RATING.DEFAULT,
        min: [0, 'Rating cannot be negative'],
    },
}, {
    timestamps: true,
});

// Instance method to get public profile (without sensitive data)
userSchema.methods.toPublicProfile = function() {
    return {
        _id: this._id,
        playerName: this.playerName,
        playerId: this.playerId,
        playerEmailId: this.playerEmailId,
        playerRating: this.playerRating,
    };
};

// Static method to find by credentials
userSchema.statics.findByPlayerId = function(playerId) {
    return this.findOne({ playerId }).select('+playerPassword');
};

module.exports = model('User', userSchema);
