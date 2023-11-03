var isCameraStarted = false;

async function loadModels() {
    const MODEL_URL = '/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
}

loadModels();

window.onload = function () {
    // Clear the results div
    document.getElementById('results').innerHTML = '';
};

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

function stopCamera() {
    if (isCameraStarted) {
        Webcam.reset();
        isCameraStarted = false;
        document.getElementById('my-camera').style.display = 'none';
    }
}

document.getElementById('start-camera').onclick = function (event) {
    startCamera();
    document.getElementById('capture-photo').disabled = false; // Enable the capture button
};

document.getElementById('capture-photo').onclick = async function (event) {
    Webcam.snap(async function (data_uri) {
        document.getElementById('snapshot').value = data_uri;

        // Convert the data URI to a HTML image element
        const img = new Image();
        img.src = data_uri;
        await new Promise(resolve => img.onload = resolve);

        // Extract the face descriptor
        const detections = await faceapi.detectAllFaces(img)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (detections.length > 0) {
            const descriptor = detections[0].descriptor;
            document.getElementById('descriptor').value = JSON.stringify(descriptor);
            console.log(`Stored descriptor: ${JSON.stringify(descriptor)}`);
            // Enable the submit button
            document.getElementById('submit-search').disabled = false;
        }
    });

    stopCamera();
    document.getElementById('capture-photo').disabled = true;  // Disable the snapshot button
};

document.getElementById('submit-search').onclick = function (event) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    while (resultsDiv.firstChild) {
        resultsDiv.firstChild.remove();
    }

    const descriptorString = document.getElementById('descriptor').value;
    console.log(`Sent descriptor: ${descriptorString}`);
    const descriptor = JSON.parse(descriptorString);
    $.ajax({
        url: '/facesearch',
        method: 'POST',
        data: JSON.stringify({ descriptor: descriptor }),
        processData: false,
        contentType: 'application/json'
    }).done(function (notes) {
        const resultsDiv = document.getElementById('results');
        let rowDiv = null; // This will be used to group two cards into a single row

        notes.forEach((note, index) => {
            // Create a new row for every two cards
            if (index % 2 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.className = 'row';
                resultsDiv.appendChild(rowDiv);
            }

            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-6';

            const noteCard = document.createElement('div');
            noteCard.className = 'card mt-3'; // Add Bootstrap card class and margin-top

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm float-right ml-2'; // Top right
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = function () {
                console.log(note._id)
                if (confirm('Are you sure you want to delete this note?')) {
                    $.ajax({
                        url: `/note/${note._id}`,
                        method: 'DELETE'
                    }).done(function () {
                        alert('Note deleted successfully');
                        location.reload();  // Reload the page to reflect the changes
                    }).fail(function (err) {
                        alert('Error: ' + err.responseText);
                    });
                }
            };

            cardBody.appendChild(deleteButton);

            const updateButton = document.createElement('a');
            updateButton.className = 'btn btn-warning btn-sm float-right'; // Top right next to delete button
            updateButton.textContent = 'Update';
            updateButton.href = `/update-note/${note._id}`; // Assuming the note has an _id field
            cardBody.appendChild(updateButton);

            const cardTitle = document.createElement('h5');
            cardTitle.className = 'card-title';
            cardTitle.textContent = `Name: ${note.personName}`;
            cardBody.appendChild(cardTitle);

            const cardSubtitle = document.createElement('h6');
            cardSubtitle.className = 'card-subtitle mb-2 text-muted';
            cardSubtitle.textContent = `Topic: ${note.noteTopic}`;
            cardBody.appendChild(cardSubtitle);

            const cardText = document.createElement('p');
            cardText.className = 'card-text';
            cardText.innerHTML = note.noteText;
            cardBody.appendChild(cardText);

            noteCard.appendChild(cardBody);
            colDiv.appendChild(noteCard);
            rowDiv.appendChild(colDiv);
        });
    }).fail(function (err) {
        alert('Error: ' + err.responseText);
    });
};