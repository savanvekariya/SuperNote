$(document).ready(function () {
    $('#signup-form').on('submit', function (e) {
        e.preventDefault();

        var username = $('#username').val();
        var password = $('#password').val();
        var email = $('#email').val();

        $.post('/signup', { username: username, email: email, password: password })
            .done(function (data) {
                // alert('Signup successful!');
                window.location.href = '/profile';
            })
            .fail(function (err) {
                alert('Error: ' + err.responseText);
            });

    });
});
