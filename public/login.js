document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = document.getElementById('submit-btn');

    errorMsg.textContent = '';
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    try {
        const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '';
        const response = await fetch(API_URL + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.href = '/admin.html';
        } else {
            errorMsg.textContent = data.error || 'Invalid credentials';
        }
    } catch (error) {
        errorMsg.textContent = 'Network error. Please try again.';
    } finally {
        if (!window.location.href.includes('admin.html')) {
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        }
    }
});
