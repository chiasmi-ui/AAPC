(function feedbackPage() {
  let rating = 0;
  const stars = document.getElementById('stars');
  stars.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('');
  const paint = () => stars.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= rating));
  stars.addEventListener('click', (e) => {
    if (e.target.dataset.n) { rating = Number(e.target.dataset.n); paint(); }
  });

  function wire(form, endpoint, extra = () => ({}), success) {
    const msg = form.querySelector('.form-msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { ...Object.fromEntries(new FormData(form)), ...extra() };
      msg.className = 'form-msg';
      msg.textContent = 'Sending…';
      try {
        await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
        msg.className = 'form-msg ok';
        msg.textContent = success;
        form.reset();
        rating = 0;
        paint();
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = err.message;
      }
    });
  }

  wire(document.getElementById('feedback-form'), '/api/feedback', () => ({ rating }), 'Thank you! Your feedback was sent to the eboard.');
  wire(document.getElementById('topic-form'), '/api/topic-requests', undefined, 'Request received — our writers will take a look!');
})();
