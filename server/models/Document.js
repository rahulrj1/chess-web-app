const { Schema, model } = require('mongoose');

const DocumentSchema = new Schema({
    _id: {
        type: String,
        required: true
    },
    data: {
        type: Object,
        required: true
    },
    chance: {
        type: String,
        enum: ['white', 'black'],
        default: 'white'
    },
    black: {
        type: String,
        default: null
    },
    white: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = model('Document', DocumentSchema);