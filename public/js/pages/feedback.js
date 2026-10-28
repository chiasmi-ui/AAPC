(function feedbackPage() {
  let rating = 0;
  const stars = document.getElementById('stars');
  stars.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('');
  const paint = () => stars.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= rating));
  stars.addEventListener('click', (e) => {
    if (e.target.dataset.n) { rating = Number(e.target.dataset.n); paint(); }
  });

  wireForm(document.getElementById('feedback-form'), '/api/feedback', {
    required: [['message', 'Write your feedback first.']],
    extra: () => ({ rating }),
    success: 'Thanks! The eboard will read it.',
    onReset: () => { rating = 0; paint(); }
  });
  wireForm(document.getElementById('topic-form'), '/api/topic-requests', {
    required: [['topic', 'Tell us the topic you want covered.']],
    success: 'Got it! We’ll pass it on to the writers.'
  });
})();
