var isCameraStarted = false;
var quill = new Quill('#editor', {
    theme: 'snow'
});

async function loadModels() {
    const MODEL_URL = '/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
}

loadModels();

// Function to start the camera
function startCamera() {
    if (!isCameraStarted) {
        Webcam.set({
            width: 320,
            height: 240,
            image_format: 'jpeg',
            jpeg_quality: 90
        });
        Webcam.attach('#my-camera');
        isCameraStarted = true;
        document.getElementById('my-camera').style.display = 'block';
    }
}

// Function to stop the camera
function stopCamera() {
    if (isCameraStarted) {
        Webcam.reset();
        isCameraStarted = false;
        document.getElementById('my-camera').style.display = 'none';
    }
}

// Handle start camera button click
document.getElementById('start-camera').onclick = function (event) {
    startCamera();
    document.getElementById('capture-photo').disabled = false;  // Enable the snapshot button
};

// Handle capture button click
document.getElementById('capture-photo').onclick = function (event) {
    Webcam.snap(async function (data_uri) {
        document.getElementById('snapshot').value = data_uri;
        document.getElementById('message').textContent = 'Photo has been taken!';

            const image = await faceapi.fetchImage(data_uri);
            const detections = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
            if (detections) {
                document.getElementById('descriptor').value = detections.descriptor;
            } else {
                console.log('No faces detected in image.');
            }

        if (detections.length > 0) {
            if (Array.isArray(detections.descriptor)) {
                document.getElementById('descriptor').value = JSON.stringify(detections.descriptor);
            } else {
                console.log('Descriptor is not an array.');
            }
            
        }
    });

    stopCamera();
    document.getElementById('capture-photo').disabled = true;  // Disable the snapshot button
};


$('#new-note-form').on('submit', function (e) {
    e.preventDefault();
    var noteContent = quill.root.innerHTML;
    $('#note-text').val(noteContent);

    var personName = $('#person-name').val();
    var noteTopic = $('#note-topic').val();
    var noteText = $('#note-text').val();
    var photo = $('#snapshot').val();
    var descriptorString = $('#descriptor').val();

    console.log('descriptorString:', descriptorString);
    console.log('First 25 characters of descriptorString:', descriptorString.substring(0, 25));

    // Splitting the descriptor string into an array of numbers
    var descriptor = descriptorString ? descriptorString.split(',').map(Number) : [];

    var data = {
        personName: personName,
        noteTopic: noteTopic,
        noteText: noteText,
        photo: btoa(photo),  // use Base64 encoding
        descriptor: descriptor
    };

    $.ajax({
        url: '/newnote',
        method: 'POST',
        data: JSON.stringify(data),
        processData: false,
        contentType: 'application/json'  // tell the server we're sending JSON
    }).done(function () {
        alert('Note created successfully');
        window.location.href = '/profile';
    }).fail(function (err) {
        alert('Error: ' + err.responseText);
    });
});