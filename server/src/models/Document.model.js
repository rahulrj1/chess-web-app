/**
 * Document Model (Game Board)
 * Represents a chess game session
 */

const { Schema, model } = require('mongoose');
const { PLAYER_COLORS } = require('../utils/constants');

const documentSchema = new Schema({
    _id: {
        type: String,
        required: true,
    },
    data: {
        type: Object,
        required: true,
    },
    chance: {
        type: String,
        enum: Object.values(PLAYER_COLORS),
        default: PLAYER_COLORS.WHITE,
    },
    black: {
        type: String,
        default: null,
    },
    white: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

// Static method to find or create a game
documentSchema.statics.findOrCreate = async function(id, initialPieces) {
    if (!id) return null;

    let document = await this.findById(id);
    
    if (!document) {
        document = await this.create({
            _id: id,
            data: initialPieces,
            chance: PLAYER_COLORS.WHITE,
            black: null,
            white: null,
        });
    }
    
    return document;
};

module.exports = model('Document', documentSchema);
