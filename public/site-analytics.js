(function initializeSiteAnalytics(global, document) {
  'use strict';

  if (global.__eb28SiteAnalyticsInitialized) return;
  global.__eb28SiteAnalyticsInitialized = true;

  var ALLOWED_CADETCATCH_EVENTS = {
    guide_view: true,
    pricing_view: true,
    app_store_click: true,
  };
  var pendingEvents = [];
  var ga4Enabled = false;
  var configResolved = false;
  var appleAttributionConfig = null;
  var appleLinkObserver = null;

  global.dataLayer = global.dataLayer || [];
  global.gtag = global.gtag || function gtag() {
    global.dataLayer.push(arguments);
  };

  function cleanValue(value, maxLength) {
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value === null || typeof value === 'undefined') return undefined;
    return String(value).trim().slice(0, maxLength || 100);
  }

  function queryValue(params, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      var value = cleanValue(params.get(keys[index]));
      if (value) return value;
    }
    return '';
  }

  function readAttribution() {
    var current = {};

    try {
      var params = new URLSearchParams(global.location.search);
      var source = queryValue(params, ['utm_source']);
      var medium = queryValue(params, ['utm_medium']);
      var googleClickIdPresent = ['gclid', 'gbraid', 'wbraid'].some(function (key) {
        return params.has(key);
      });
      current = {
        campaign: queryValue(params, ['campaign', 'utm_campaign']),
        creative: queryValue(params, ['creative', 'utm_content']),
        source: source,
        medium: medium,
        google_paid:
          googleClickIdPresent ||
          (source.toLowerCase() === 'google' && medium.toLowerCase() === 'cpc'),
      };

      if (current.campaign || current.creative || current.source || current.medium || current.google_paid) {
        global.sessionStorage.setItem('cadetcatch_attribution', JSON.stringify(current));
      } else {
        var stored = JSON.parse(global.sessionStorage.getItem('cadetcatch_attribution') || '{}');
        current.campaign = cleanValue(stored.campaign) || '';
        current.creative = cleanValue(stored.creative) || '';
        current.source = cleanValue(stored.source) || '';
        current.medium = cleanValue(stored.medium) || '';
        current.google_paid = stored.google_paid === true;
      }
    } catch (_) {
      // URLSearchParams or sessionStorage can be unavailable in hardened browsers.
    }

    return {
      campaign: current.campaign || 'unattributed',
      creative: current.creative || 'unattributed',
      source: current.source || 'unattributed',
      medium: current.medium || 'unattributed',
      google_paid: current.google_paid === true,
    };
  }

  function eventPayload(parameters) {
    var payload = readAttribution();
    var input = parameters && typeof parameters === 'object' ? parameters : {};

    Object.keys(input).forEach(function (key) {
      var cleaned = cleanValue(input[key], key === 'link_url' ? 500 : 100);
      if (typeof cleaned !== 'undefined' && cleaned !== '') payload[key] = cleaned;
    });

    return payload;
  }

  function sendEvent(event) {
    global.gtag('event', event.name, event.parameters);
  }

  function configureAppleCampaignLink(link, config) {
    var providerToken = cleanValue(config && config.appleProviderToken, 40);
    var googleCampaignToken = cleanValue(config && config.appleGoogleCampaignToken, 40);
    if (!providerToken || !/^\d+$/.test(providerToken)) return;
    if (!link || typeof link.getAttribute !== 'function') return;

    var attribution = readAttribution();
    var declaredCampaignToken = cleanValue(
      link.getAttribute('data-cc-apple-campaign-token'),
      40,
    );
    var campaignToken = attribution.google_paid && googleCampaignToken
      ? googleCampaignToken
      : declaredCampaignToken;
    if (!campaignToken || !/^[A-Za-z0-9_-]+$/.test(campaignToken)) return;

    try {
      var url = new URL(link.href);
      url.searchParams.set('pt', providerToken);
      url.searchParams.set('ct', campaignToken);
      url.searchParams.set('mt', '8');
      link.href = url.toString();
    } catch (_) {
      // Keep the base App Store URL when URL parsing is unavailable.
    }
  }

  function configureAppleCampaignLinks(config) {
    appleAttributionConfig = config;

    var links = document.querySelectorAll('[data-cc-app-store]');
    Array.prototype.forEach.call(links, function (link) {
      configureAppleCampaignLink(link, config);
    });

    if (appleLinkObserver || typeof global.MutationObserver !== 'function') return;
    var root = document.documentElement || document.body;
    if (!root) return;

    appleLinkObserver = new global.MutationObserver(function (mutations) {
      Array.prototype.forEach.call(mutations, function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) return;
          if (typeof node.matches === 'function' && node.matches('[data-cc-app-store]')) {
            configureAppleCampaignLink(node, config);
          }
          if (typeof node.querySelectorAll === 'function') {
            var nestedLinks = node.querySelectorAll('[data-cc-app-store]');
            Array.prototype.forEach.call(nestedLinks, function (nestedLink) {
              configureAppleCampaignLink(nestedLink, config);
            });
          }
        });
      });
    });
    appleLinkObserver.observe(root, { childList: true, subtree: true });
  }

  function trackCadetCatchEvent(name, parameters) {
    if (!ALLOWED_CADETCATCH_EVENTS[name]) return false;

    var event = {
      name: name,
      parameters: eventPayload(parameters),
    };

    if (ga4Enabled) {
      sendEvent(event);
      return true;
    }

    if (!configResolved && pendingEvents.length < 50) pendingEvents.push(event);
    return false;
  }

  global.CadetCatchAnalytics = Object.freeze({
    track: trackCadetCatchEvent,
    attribution: readAttribution,
  });

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[data-cc-app-store]')
        : null;
      if (!target) return;

      if (appleAttributionConfig) {
        configureAppleCampaignLink(target, appleAttributionConfig);
      }

      trackCadetCatchEvent('app_store_click', {
        link_location: target.getAttribute('data-cc-link-location') || 'unknown',
        link_url: target.href || '',
        transport_type: 'beacon',
      });
    },
    true,
  );

  fetch('/analytics-config.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('analytics config unavailable');
      return response.json();
    })
    .then(function (config) {
      var measurementId = cleanValue(config && config.ga4MeasurementId);
      configResolved = true;
      configureAppleCampaignLinks(config);

      if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
        pendingEvents = [];
        return;
      }

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
      document.head.appendChild(script);

      global.gtag('js', new Date());
      global.gtag('config', measurementId);
      ga4Enabled = true;
      pendingEvents.forEach(sendEvent);
      pendingEvents = [];
    })
    .catch(function () {
      configResolved = true;
      pendingEvents = [];
    });
})(window, document);
