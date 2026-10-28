wireForm(document.getElementById('suggestion-form'), '/api/suggestions', {
  required: [['suggestion', 'Write your suggestion first.']],
  success: 'Thanks! The eboard will read it.'
});
