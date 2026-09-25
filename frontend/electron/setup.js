const form = document.getElementById('setup-form')
const result = document.getElementById('result')
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const button = form.querySelector('button')
  button.disabled = true
  result.textContent = 'Connecting to PostgreSQL…'
  try {
    await window.trackerApi.setupDatabase(
      document.getElementById('admin-password').value,
      document.getElementById('existing-password').value,
    )
    result.textContent = 'Database ready. Opening Internship Hub…'
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : 'Database setup failed.'
  } finally {
    button.disabled = false
    document.getElementById('admin-password').value = ''
    document.getElementById('existing-password').value = ''
  }
})
