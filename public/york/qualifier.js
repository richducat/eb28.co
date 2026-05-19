(() => {
  const form = document.getElementById('inspectionQualifier');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.form-step'));
  const currentStepLabel = document.getElementById('currentStepLabel');
  const stepTitle = document.getElementById('stepTitle');
  const progressBar = document.getElementById('progressBar');
  const prev = document.getElementById('prevStep');
  const next = document.getElementById('nextStep');
  const submit = document.getElementById('submitForm');
  const status = document.getElementById('formStatus');
  const scoreField = document.getElementById('leadScore');
  const summaryField = document.getElementById('qualificationSummary');
  let step = 0;

  function visibleRequiredFields() {
    return Array.from(steps[step].querySelectorAll('[required]'));
  }

  function updateScore() {
    const data = new FormData(form);
    let score = 0;
    const inspectionType = data.get('inspection_type') || '';
    const timeline = data.get('timeline') || '';
    const reason = data.get('inspection_reason') || '';
    const access = data.get('property_access') || '';
    const decision = data.get('decision_status') || '';
    const area = String(data.get('property_area') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();

    if (inspectionType && inspectionType !== 'Not sure yet') score += 20;
    if (['ASAP / next available', 'This week', 'Within 2 weeks'].includes(timeline)) score += 18;
    if (area.length > 2) score += 8;
    if (data.get('property_type')) score += 10;
    if (data.get('square_footage')) score += 5;
    if (data.get('year_built')) score += 5;
    if (reason && reason !== 'Unsure') score += 14;
    if (access === 'Yes, access is confirmed') score += 14;
    else if (access === 'Yes, but needs coordination') score += 8;
    if (decision === 'I am the decision maker' || decision === 'I am coordinating for the owner / buyer') score += 12;
    if (String(data.get('deadline_or_concerns') || '').trim().length > 12) score += 5;
    if (phone && email) score += 9;

    score = Math.min(score, 100);
    scoreField.value = String(score);
    const band = score >= 75 ? 'High intent' : score >= 50 ? 'Needs review' : 'Low/early intent';
    summaryField.value = `${band} lead (${score}/100). Type: ${inspectionType || 'n/a'}; Timeline: ${timeline || 'n/a'}; Reason: ${reason || 'n/a'}; Area: ${area || 'n/a'}; Access: ${access || 'n/a'}; Decision: ${decision || 'n/a'}.`;
    return { score, band };
  }

  function render() {
    steps.forEach((el, index) => el.classList.toggle('active', index === step));
    currentStepLabel.textContent = String(step + 1);
    stepTitle.textContent = steps[step].dataset.title || '';
    progressBar.style.width = `${((step + 1) / steps.length) * 100}%`;
    prev.style.visibility = step === 0 ? 'hidden' : 'visible';
    next.classList.toggle('hidden', step === steps.length - 1);
    submit.classList.toggle('hidden', step !== steps.length - 1);
    status.textContent = '';
    updateScore();
  }

  function validateStep() {
    let ok = true;
    visibleRequiredFields().forEach((field) => {
      if (!field.checkValidity()) {
        field.reportValidity();
        ok = false;
      }
    });
    return ok;
  }

  next.addEventListener('click', () => {
    if (!validateStep()) return;
    step = Math.min(step + 1, steps.length - 1);
    render();
  });

  prev.addEventListener('click', () => {
    step = Math.max(step - 1, 0);
    render();
  });

  form.addEventListener('input', updateScore);
  form.addEventListener('change', updateScore);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    const { score, band } = updateScore();
    status.textContent = 'Sending your inspection request...';
    submit.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      status.textContent = 'Request sent. York Inspections will review your details and follow up.';
      form.reset();
      step = 0;
      setTimeout(render, 900);
    } catch (error) {
      status.innerHTML = 'The form could not submit automatically. Please call/text <a href="tel:3213390167">321-339-0167</a> or email <a href="mailto:yorkinspectionsllc@gmail.com">yorkinspectionsllc@gmail.com</a>.';
    } finally {
      submit.disabled = false;
    }
  });

  render();
})();
