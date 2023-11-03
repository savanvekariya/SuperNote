const express = require('express');
const router = express.Router();
const passport = require('passport');
const faceapi = require('@vladmandic/face-api');
const User = require('../models/User');
const path = require('path');
const Note = require('../models/Note');


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        // Redirect unauthenticated requests to the login page
        res.redirect('/login');
    }
}

function euclideanDistance(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        throw new Error('Arrays should have the same length');
    }

    var squareSum = 0;
    for (var i = 0; i < arr1.length; i++) {
        squareSum += Math.pow(arr1[i] - arr2[i], 2);
    }

    return Math.sqrt(squareSum);
}

//face search functionality with search bar

router.get('/search-notes', ensureAuthenticated, async function (req, res) {
    try {
        let query = req.query.query; // This gets the search query from the URL
        let notes = await Note.find({
            userId: req.user._id,
            $or: [
                { personName: new RegExp(query, 'i') },  // 'i' means case-insensitive
                { noteTopic: new RegExp(query, 'i') }
            ]
        });
        res.render('profile', { user: req.user, notes: notes });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while searching notes.');
    }
});


//facesearch routing
router.post('/facesearch', async function (req, res, next) {
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const descriptor = req.body.descriptor;
    const userId = req.user._id;

    const matchedNotes = await findMatchingNotes(descriptor, userId);

    // Send the matching notes back to the client
    res.json(matchedNotes.map(note => ({
        _id: note._id,
        noteText: note.noteText,
        noteTopic: note.noteTopic,
        personName: note.personName
    })));

});

async function findMatchingNotes(descriptor, userId) {
    // Parse the descriptor string back into an array, if it is a string
    var queryDescriptor;
    if (typeof descriptor === "string") {
        queryDescriptor = JSON.parse(descriptor);
    } else {
        queryDescriptor = descriptor;
    }
    queryDescriptor = Object.values(queryDescriptor); // Convert object to array

    // Get all the notes from the database
    var notes = await Note.find({ userId: userId });

    // Filter the notes to only include those with a matching descriptor
    var matchedNotes = notes.filter(note => {
        // Parse the note's descriptor string back into an array, if it is a string
        var noteDescriptor = (typeof note.faceDescriptor === "string") ? JSON.parse(note.faceDescriptor) : note.faceDescriptor;

        // Compare the query descriptor with the note's descriptor
        var distance = euclideanDistance(queryDescriptor, noteDescriptor);

        // Consider the descriptors to match if the distance is below a certain threshold
        return distance < 0.5;
    });

    return matchedNotes;
}

//facesearch page routing
router.get('/facesearch', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/facesearch.html'));
});


//creating new note
router.post('/newnote', async function (req, res, next) {
    var personName = req.body.personName;
    var noteTopic = req.body.noteTopic;
    var noteText = req.body.noteText;
    var photo = req.body.photo;  // This is the data URI of the photo
    var descriptor = req.body.descriptor;  // It is an array now

    // Check if descriptor is not empty and is an array
    if (descriptor && Array.isArray(descriptor) && descriptor.length > 0) {
        var newNote = new Note({
            personName: personName,
            noteTopic: noteTopic,
            noteText: noteText,
            photo: photo,
            faceDescriptor: descriptor,
            userId: req.user._id
        });

        try {
            await newNote.save();
            res.send('Note created successfully');
        } catch (err) {
            return next(err);
        }
    } else {
        return next(new Error('Descriptor is missing or empty'));
    }
});

//For Updating Notes
router.get('/update-note/:id', ensureAuthenticated, async function (req, res) {
    try {
        const note = await Note.findById(req.params.id);
        if (note.userId.toString() === req.user._id.toString()) {
            res.render('update-note', { user: req.user, note: note });
        } else {
            res.status(403).send('Permission denied.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred.');
    }
});

router.post('/note/:id/update', ensureAuthenticated, async function (req, res) {
    try {
        await Note.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while updating the note.');
    }
});


//For deleting notes
router.delete('/note/:id', ensureAuthenticated, async function (req, res) {
    try {
        await Note.findByIdAndRemove(req.params.id);
        res.status(200).send('Note deleted successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while deleting the note.');
    }
});



//getting all note to the profile page

router.get('/profile', ensureAuthenticated, async function (req, res) {
    try {
        let notes = await Note.find({ userId: req.user._id });
        res.render('profile', { user: req.user, notes: notes });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while retrieving notes.');
    }
});


router.get('/', function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/profile');
    } else {
        res.redirect('/login');
    }
});

//Signup page

router.post('/signup', (req, res) => {
    User.register(new User({ username: req.body.username, email: req.body.email }), req.body.password, (err, user) => {
        if (err) {
            console.error(err);
            res.status(500).send('An error occurred during sign up.');
            return;
        }
        passport.authenticate('local')(req, res, () => {
            res.send('Signed up!');
        });
    });
});


//Login Logout page

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error(err);
            res.status(500).send('An error occurred during login.');
            return;
        }
        if (!user) {
            res.status(401).send('Invalid username or password.');
            return;
        }
        req.login(user, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('An error occurred during login.');
                return;
            }
            res.send('Logged in!');
        });
    })(req, res, next);
});

//routes for all the files

router.get('/signup', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

router.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});


router.get('/logout', function (req, res) {
    req.logout(function(err) {
        if(err) {
            console.error(err);
            return res.status(500).send("Error logging out.");
        }
        res.redirect('/login');
    });
});


router.get('/newnote', ensureAuthenticated, function (req, res) {
    res.sendFile(path.join(__dirname, '../public/newnote.html'));
});

module.exports = router;