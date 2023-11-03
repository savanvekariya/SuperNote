const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NoteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  personName: String,
  noteTopic: String,
  noteText: String,
  created_at: { type: Date, default: Date.now },
  photo: String,
  faceDescriptor: [Number]
});

module.exports = mongoose.model('Note', NoteSchema);
