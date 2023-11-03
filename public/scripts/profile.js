$('#logout-button').on('click', function () {
    $.get('/logout', function () {
        window.location.href = '/login';
    });
});

$(document).ready(function () {

    $('.delete-note').on('click', function () {
        const noteId = $(this).data('note-id');
        $.ajax({
            url: '/note/' + noteId,
            method: 'DELETE',
        }).done(function () {
            alert('Note deleted successfully');
            location.reload();  // Reload the page to show the notes after deletion
        }).fail(function (err) {
            alert('Error: ' + err.responseText);
        });
    });

});