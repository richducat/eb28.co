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
  const selectedOfferName = document.getElementById('selectedOfferName');
  const selectedOfferPrice = document.getElementById('selectedOfferPrice');
  const selectedOfferDuration = document.getElementById('selectedOfferDuration');
  const selectedOfferUrl = document.getElementById('selectedOfferUrl');
  const selectedOfferPanel = document.getElementById('selectedOfferPanel');
  const selectedOfferSummary = document.getElementById('selectedOfferSummary');
  const selectedOfferLink = document.getElementById('selectedOfferLink');
  const paymentHandoff = document.getElementById('paymentHandoff');
  const paymentHandoffLink = document.getElementById('paymentHandoffLink');
  const propertyAddress = document.getElementById('propertyAddress');
  const addressSuggestions = document.getElementById('addressSuggestions');
  const selectedAddress = document.getElementById('selectedAddress');
  const normalizedAddress = document.getElementById('normalizedAddress');
  const propertyArea = document.getElementById('propertyArea');
  const propertyLatitude = document.getElementById('propertyLatitude');
  const propertyLongitude = document.getElementById('propertyLongitude');
  const addressSource = document.getElementById('addressSource');
  const phoneInput = form.querySelector('input[name="phone"]');
  let step = 0;
  let addressTimer;
  let addressAbort;

  function visibleRequiredFields() {
    return Array.from(steps[step].querySelectorAll('[required]'));
  }

  function updateScore() {
    const data = new FormData(form);
    let score = 0;
    const inspectionType = data.get('inspection_type') || '';
    const timeline = data.get('timeline') || '';
    const access = data.get('property_access') || '';
    const decision = data.get('decision_status') || '';
    const area = String(data.get('property_area') || '').trim();
    const address = String(data.get('property_address') || '').trim();
    const offerPrice = selectedOfferPrice?.value || '';
    const offerDuration = selectedOfferDuration?.value || '';
    const bookingUrl = selectedOfferUrl?.value || '';
    const verifiedAddress = normalizedAddress?.value || address;
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();

    if (inspectionType && inspectionType !== 'Not sure yet') score += 20;
    if (['ASAP / next available', 'This week', 'Within 2 weeks'].includes(timeline)) score += 18;
    if (verifiedAddress.length > 7) score += 12;
    if (area.length > 2) score += 4;
    if (data.get('property_type')) score += 10;
    if (access === 'Yes, access is confirmed') score += 14;
    else if (access === 'Yes, but needs coordination') score += 8;
    if (decision === 'I am the decision maker' || decision === 'I am coordinating for the owner / buyer') score += 12;
    if (String(data.get('deadline_or_concerns') || '').trim().length > 12) score += 5;
    if (phone && email) score += 9;

    score = Math.min(score, 100);
    scoreField.value = String(score);
    const band = score >= 75 ? 'High intent' : score >= 50 ? 'Needs review' : 'Low/early intent';
    summaryField.value = `${band} lead (${score}/100). Offer: ${inspectionType || 'n/a'} (${offerPrice || 'n/a'}, ${offerDuration || 'n/a'}); Booking URL: ${bookingUrl || 'n/a'}; Address: ${verifiedAddress || 'n/a'}; Timeline: ${timeline || 'n/a'}; Area: ${area || 'n/a'}; Access: ${access || 'n/a'}; Decision: ${decision || 'n/a'}.`;
    return { score, band };
  }

  function syncOffer() {
    const selected = form.querySelector('input[name="inspection_type"]:checked');
    if (!selected) {
      [selectedOfferName, selectedOfferPrice, selectedOfferDuration, selectedOfferUrl].forEach((field) => {
        if (field) field.value = '';
      });
      selectedOfferPanel.hidden = true;
      paymentHandoff.hidden = true;
      return;
    }

    const name = selected.value;
    const price = selected.dataset.price || '';
    const duration = selected.dataset.duration || '';
    const url = selected.dataset.url || 'https://yorkinspections.com/';

    selectedOfferName.value = name;
    selectedOfferPrice.value = price;
    selectedOfferDuration.value = duration;
    selectedOfferUrl.value = url;
    selectedOfferSummary.textContent = `${name} - ${price} - ${duration}`;
    selectedOfferLink.href = url;
    paymentHandoffLink.href = url;
    selectedOfferPanel.hidden = false;
    paymentHandoff.hidden = false;
  }

  function setAddressMessage(message) {
    if (!addressSuggestions) return;
    addressSuggestions.innerHTML = `<button type="button" disabled>${message}</button>`;
    addressSuggestions.hidden = false;
  }

  function hideAddressSuggestions() {
    if (!addressSuggestions) return;
    addressSuggestions.hidden = true;
    addressSuggestions.innerHTML = '';
  }

  function setAddressMatch(match) {
    const components = match.addressComponents || {};
    const city = components.city || '';
    const state = components.state || '';
    const zip = components.zip || '';
    const area = [city, state].filter(Boolean).join(', ');

    propertyAddress.value = match.matchedAddress || propertyAddress.value;
    normalizedAddress.value = match.matchedAddress || '';
    propertyArea.value = [area, zip].filter(Boolean).join(' ');
    propertyLatitude.value = match.coordinates?.y ? String(match.coordinates.y) : '';
    propertyLongitude.value = match.coordinates?.x ? String(match.coordinates.x) : '';
    addressSource.value = 'ArcGIS World Geocoder';

    selectedAddress.hidden = false;
    selectedAddress.innerHTML = `<span>Verified address</span><strong>${match.matchedAddress}</strong>`;
    hideAddressSuggestions();
    updateScore();
  }

  function renderAddressSuggestions(matches) {
    if (!addressSuggestions) return;
    if (!matches.length) {
      setAddressMessage('No public match yet. Keep typing or continue manually.');
      return;
    }

    addressSuggestions.innerHTML = '';
    matches.slice(0, 5).forEach((match) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.textContent = match.matchedAddress;
      button.addEventListener('click', () => setAddressMatch(match));
      addressSuggestions.appendChild(button);
    });
    addressSuggestions.hidden = false;
  }

  function normalizeArcgisCandidate(candidate) {
    const attributes = candidate.attributes || {};
    const matchedAddress = attributes.LongLabel || attributes.Match_addr || candidate.address || '';
    return {
      matchedAddress: matchedAddress.replace(/, USA$/i, ''),
      coordinates: candidate.location || { x: attributes.DisplayX, y: attributes.DisplayY },
      addressComponents: {
        city: attributes.City || '',
        state: attributes.RegionAbbr || attributes.Region || '',
        zip: attributes.Postal || ''
      },
      confidence: attributes.Score || candidate.score || ''
    };
  }

  async function lookupAddress(query) {
    if (!propertyAddress || query.length < 8) {
      hideAddressSuggestions();
      return;
    }

    if (addressAbort) addressAbort.abort();
    addressAbort = new AbortController();
    setAddressMessage('Searching U.S. address matches...');

    const endpoint = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
    endpoint.searchParams.set('f', 'json');
    endpoint.searchParams.set('countryCode', 'USA');
    endpoint.searchParams.set('maxLocations', '5');
    endpoint.searchParams.set('outFields', '*');
    endpoint.searchParams.set('singleLine', query);

    try {
      const response = await fetch(endpoint, { signal: addressAbort.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      renderAddressSuggestions((payload.candidates || []).map(normalizeArcgisCandidate));
    } catch (error) {
      if (error.name === 'AbortError') return;
      setAddressMessage('Address lookup is unavailable. You can continue manually.');
    }
  }

  function queueAddressLookup() {
    clearTimeout(addressTimer);
    normalizedAddress.value = '';
    propertyLatitude.value = '';
    propertyLongitude.value = '';
    addressSource.value = propertyAddress.value.trim() ? 'Manual entry' : '';
    selectedAddress.hidden = true;
    propertyArea.value = '';
    updateScore();

    addressTimer = setTimeout(() => {
      lookupAddress(propertyAddress.value.trim());
    }, 350);
  }

  function formatPhone() {
    const digits = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) {
      phoneInput.value = digits;
    } else if (digits.length <= 6) {
      phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  }

  function render(options = {}) {
    const { clearStatus = true } = options;
    steps.forEach((el, index) => el.classList.toggle('active', index === step));
    currentStepLabel.textContent = String(step + 1);
    stepTitle.textContent = steps[step].dataset.title || '';
    progressBar.style.width = `${((step + 1) / steps.length) * 100}%`;
    prev.style.visibility = step === 0 ? 'hidden' : 'visible';
    next.classList.toggle('hidden', step === steps.length - 1);
    submit.classList.toggle('hidden', step !== steps.length - 1);
    if (clearStatus) status.textContent = '';
    updateScore();
  }

  function validateStep() {
    let ok = true;
    const activeStep = steps[step];
    const requiredRadios = Array.from(activeStep.querySelectorAll('input[type="radio"][required]'));
    const requiredRadioNames = [...new Set(requiredRadios.map((field) => field.name).filter(Boolean))];

    requiredRadioNames.forEach((name) => {
      const group = requiredRadios.filter((field) => field.name === name);
      if (!group.some((field) => field.checked)) {
        status.textContent = 'Choose one answer to continue.';
        group[0]?.closest('.choice')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        ok = false;
      }
    });

    if (!ok) return false;

    visibleRequiredFields().filter((field) => field.type !== 'radio').forEach((field) => {
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
  form.addEventListener('change', () => {
    syncOffer();
    updateScore();
  });
  propertyAddress?.addEventListener('input', queueAddressLookup);
  propertyAddress?.addEventListener('blur', () => {
    window.setTimeout(hideAddressSuggestions, 180);
  });
  phoneInput?.addEventListener('input', formatPhone);

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
      syncOffer();
      hideAddressSuggestions();
      selectedAddress.hidden = true;
      setTimeout(() => render({ clearStatus: false }), 900);
    } catch (error) {
      status.innerHTML = 'The form could not submit automatically. Please call/text <a href="tel:3213390167">321-339-0167</a> or email <a href="mailto:yorkinspectionsllc@gmail.com">yorkinspectionsllc@gmail.com</a>.';
    } finally {
      submit.disabled = false;
    }
  });

  syncOffer();
  render();
})();
