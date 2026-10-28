(function magazinePage() {
  const form = document.getElementById('suggestion-form');
  const msg = form.querySelector('.form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';
    msg.textContent = 'Sending…';
    try {
      await api('/api/suggestions', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      msg.className = 'form-msg ok';
      msg.textContent = 'Thank you! Your suggestion was sent to the eboard.';
      form.reset();
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = err.message;
    }
  });
})();
